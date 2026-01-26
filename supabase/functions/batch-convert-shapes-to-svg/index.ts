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
}

async function generateSvgFromImage(
  imageUrl: string,
  shapeType: string,
  description: string,
  subject: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `You are a technical diagram vectorization expert. Convert this ${subject} diagram image into a clean, black-and-white SVG suitable for educational worksheets.

Shape type: ${shapeType}
Description: ${description || "Educational diagram"}

Requirements:
1. Output ONLY valid SVG code, nothing else
2. Use viewBox="0 0 300 300"
3. Black strokes (#000) with stroke-width="2"
4. White or transparent fill
5. Include all vertex labels (A, B, C, etc.) as <text> elements
6. Include any angle marks, right-angle symbols, or measurements shown
7. Keep it simple and clean for printing
8. No colors, gradients, or decorative elements

Return ONLY the SVG code starting with <svg and ending with </svg>.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
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
      return svg;
    }

    console.error("No valid SVG found in response");
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

    // Query shapes that need SVG generation
    let query = supabase
      .from("regents_shape_library")
      .select("id, shape_type, description, source_image_url, thumbnail_url, subject, nys_standard, tags")
      .is("svg_data", null)
      .or("source_image_url.neq.null,thumbnail_url.neq.null");

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
      const imageUrl = shape.source_image_url || shape.thumbnail_url;
      
      if (!imageUrl) {
        results.push({ id: shape.id, success: false, error: "No image URL" });
        continue;
      }

      console.log(`Processing shape ${shape.id}: ${shape.shape_type}`);

      if (dryRun) {
        results.push({ id: shape.id, success: true, error: "Dry run - no changes made" });
        continue;
      }

      try {
        const svgData = await generateSvgFromImage(
          imageUrl,
          shape.shape_type,
          shape.description || "",
          shape.subject
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
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Count remaining shapes needing conversion
    const { count: remaining } = await supabase
      .from("regents_shape_library")
      .select("id", { count: "exact", head: true })
      .is("svg_data", null)
      .or("source_image_url.neq.null,thumbnail_url.neq.null");

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
