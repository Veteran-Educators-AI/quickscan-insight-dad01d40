import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShapeRecord {
  id: string;
  shape_type: string;
  description: string | null;
  source_image_url: string | null;
  thumbnail_url: string | null;
  subject: string;
  nys_standard: string | null;
  tags: string[];
  vertices: unknown;
  parameters: unknown;
}

async function generateSvgFromDescription(
  shapeType: string,
  description: string,
  subject: string,
  vertices?: unknown,
  parameters?: unknown
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  // Build context from available data
  let context = `Shape type: ${shapeType}\nDescription: ${description || "Educational diagram"}\nSubject: ${subject}`;
  
  if (vertices) {
    context += `\nVertices: ${JSON.stringify(vertices)}`;
  }
  if (parameters) {
    context += `\nParameters: ${JSON.stringify(parameters)}`;
  }

  const prompt = `You are a technical diagram generator for educational worksheets. Create a clean, black-and-white SVG suitable for printing.

${context}

Requirements:
1. Output ONLY valid SVG code, nothing else
2. Use viewBox="0 0 300 300"
3. Black strokes (#000) with stroke-width="2"
4. White or transparent fill
5. Include all vertex labels (A, B, C, etc.) as <text> elements with font-size="14" and font-family="Arial"
6. Include any angle marks, right-angle symbols, tick marks for congruent sides, or measurements mentioned
7. Keep it simple and clean for printing - no colors, gradients, or decorative elements
8. Center the shape in the viewBox
9. For coordinate plane problems, draw axes with arrows and grid lines

Return ONLY the SVG code starting with <svg and ending with </svg>.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`AI API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract SVG from response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      let svg = svgMatch[0];
      // Ensure viewBox is set
      if (!svg.includes("viewBox")) {
        svg = svg.replace("<svg", '<svg viewBox="0 0 300 300"');
      }
      // Ensure xmlns is set
      if (!svg.includes("xmlns")) {
        svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      return svg;
    }

    console.error("No valid SVG found in response:", content.substring(0, 200));
    return null;
  } catch (error) {
    console.error("Error generating SVG:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 10, shapeIds, dryRun = false } = await req.json();

    // Query shapes that need SVG generation (no svg_data yet)
    let query = supabase
      .from("regents_shape_library")
      .select("id, shape_type, description, source_image_url, thumbnail_url, subject, nys_standard, tags, vertices, parameters")
      .is("svg_data", null);

    if (shapeIds && shapeIds.length > 0) {
      query = query.in("id", shapeIds);
    }

    const { data: shapes, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch shapes: ${fetchError.message}`);
    }

    if (!shapes || shapes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No shapes need SVG conversion",
          processed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${shapes.length} shapes...`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const shape of shapes as ShapeRecord[]) {
      console.log(`Processing shape ${shape.id}: ${shape.shape_type} - ${shape.description?.substring(0, 50)}`);

      if (dryRun) {
        results.push({ id: shape.id, success: true, error: "Dry run - no changes made" });
        continue;
      }

      try {
        const svgData = await generateSvgFromDescription(
          shape.shape_type,
          shape.description || "",
          shape.subject,
          shape.vertices,
          shape.parameters
        );

        if (svgData) {
          const { error: updateError } = await supabase
            .from("regents_shape_library")
            .update({ svg_data: svgData, updated_at: new Date().toISOString() })
            .eq("id", shape.id);

          if (updateError) {
            results.push({ id: shape.id, success: false, error: updateError.message });
          } else {
            results.push({ id: shape.id, success: true });
          }
        } else {
          results.push({ id: shape.id, success: false, error: "Failed to generate SVG" });
        }
      } catch (err) {
        results.push({
          id: shape.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Count remaining shapes needing conversion
    const { count: remaining } = await supabase
      .from("regents_shape_library")
      .select("id", { count: "exact", head: true })
      .is("svg_data", null);

    return new Response(
      JSON.stringify({
        success: true,
        processed: shapes.length,
        successCount,
        failCount,
        remaining: remaining || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Batch conversion error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
