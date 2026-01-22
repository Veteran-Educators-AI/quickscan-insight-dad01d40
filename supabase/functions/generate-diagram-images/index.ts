import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionWithPrompt {
  questionNumber: number;
  imagePrompt: string;
}

// Generate image using Nano Banana (google/gemini-2.5-flash-image-preview)
async function generateImageWithNanoBanana(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════════
    // MASTER GEOMETRY TEMPLATE - Ultra-explicit analytical prompting for AI diagrams
    // ═══════════════════════════════════════════════════════════════════════════════
    const enhancedPrompt = `You are creating a textbook-quality educational mathematical diagram.

═══════════════════════════════════════════════════════════════════════════════
[DIAGRAM REQUEST]
═══════════════════════════════════════════════════════════════════════════════
${prompt}

═══════════════════════════════════════════════════════════════════════════════
MASTER GEOMETRY TEMPLATE - FOLLOW THIS STRUCTURE EXACTLY
═══════════════════════════════════════════════════════════════════════════════

[STYLE HEADER]
"A clean, black-and-white educational diagram on a plain white background, styled like a figure in a geometry textbook. All lines are thin black lines. All text is clear, dark, sans-serif academic font. No shading, no colors, no gradients."

[ORIENTATION DEFINITION] (CRITICAL: Define the shape's physical orientation first)
"The shape is oriented such that [describe EXACT physical orientation]:
- For triangles: 'The base is horizontal along the bottom. The apex is at the top. The left vertex is at the bottom-left corner.'
- For rectangles/squares: 'The long side is horizontal. The shape sits flat on its bottom edge.'
- For circles: 'The center is at the middle of the image. The radius extends to the right.'
- For coordinate planes: 'The origin is at the center. The positive x-axis extends right. The positive y-axis extends up.'"

[KEY FEATURES & SYMBOLS]
"Include these EXACT markings:
- Right-angle symbols: Small square (⊿) placed IN the corner where the right angle is located
- Tick marks: Single tick marks (|) on sides that are equal in length
- Parallel arrows: Small arrows (>>) on lines that are parallel
- Arc symbols: Curved arcs drawn INSIDE the angle to indicate angle measurements
- Dashed lines: Use dashed lines (- - -) for altitudes, hidden edges, or construction lines"

[VERTEX & POINT LABELING]
"Label ALL vertices and points as follows:
- Each vertex gets a CAPITAL LETTER (A, B, C, D, etc.)
- Position: Place the label OUTSIDE the shape, near the vertex
- Font: Dark, clear, sans-serif, slightly larger than measurements
- For coordinate points: Label as 'A (x, y)' with the coordinates in parentheses"

[ANGLE LABELING]
"Label angles as follows:
- Location: Specify the EXACT vertex (e.g., 'the angle at the top-right corner')
- Symbol: Draw a small arc INSIDE the angle
- Label: Write the degree measurement (e.g., '60°') or variable (e.g., 'θ') near the arc
- Greek letters: Use θ (theta), α (alpha), β (beta) when variables are needed"

[SIDE/SEGMENT LABELING] (Use PHYSICAL LOCATIONS, not mathematical terms)
"Label the sides/lengths as follows:
- The [vertical side on the left] is labeled '[value] cm' or '[variable]'
- The [horizontal side on the bottom] is labeled '[value] cm' or '[variable]'  
- The [diagonal side connecting top-left to bottom-right] is labeled '[value] cm' or '[variable]'
- Position: Place labels OUTSIDE the shape, parallel to the side
- Include UNITS: Always write 'cm', 'm', or 'units' after numbers"

[COORDINATE PLANE REQUIREMENTS] (If applicable)
"For coordinate planes:
- Draw x-axis and y-axis with ARROWS at both ends
- Label 'x' at the right end of x-axis, 'y' at the top of y-axis
- Mark tick marks at EVERY integer from -10 to 10 (or appropriate range)
- Write numbers below x-axis ticks and left of y-axis ticks
- Draw a light gray GRID behind the axes
- Plot points as SOLID BLACK DOTS (radius 4-5 pixels)
- Label each point with 'P(x, y)' format directly next to the dot"

[FINAL POLISH]
"All lines are thin black lines (1-2px stroke). All text is clear, dark, sans-serif academic font. No shading, no colors, no gradients. The diagram is centered with appropriate whitespace. Professional textbook illustration quality."`;

    console.log('Generating image with Nano Banana...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Nano Banana response received');
    
    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log('Successfully generated image with Nano Banana');
        return imageUrl;
      }
    }

    console.log('No image in Nano Banana response');
    return null;
  } catch (error) {
    console.error('Error generating with Nano Banana:', error);
    return null;
  }
}

// Generate SVG diagram using standard AI model
async function generateSVGWithAI(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const enhancedPrompt = `Create a precise, textbook-quality mathematical diagram in SVG format.

DIAGRAM TO CREATE: ${prompt}

MANDATORY SVG REQUIREMENTS:

1. FOR COORDINATE PLANES:
   - Include a complete grid with light gray lines (#cccccc)
   - Bold black axes with arrows at the ends
   - Number labels on both axes at regular intervals
   - Plot points as solid black circles (r="4")
   - Label each point with its name and coordinates using <text> elements
   - Example: <text x="45" y="85" font-size="12">A (2, 5)</text>

2. FOR GEOMETRIC SHAPES:
   - Use stroke="#000000" stroke-width="2" for main outlines
   - Label all vertices with capital letters
   - Show measurements with positioned <text> elements
   - Use stroke-dasharray="5,5" for hidden/construction lines
   - Include angle arcs with degree measurements

3. FOR ALL DIAGRAMS:
   - Black lines on white background only
   - Clear, readable labels (font-size 12-14)
   - Centered composition within the viewBox
   - Professional textbook illustration quality`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating SVG diagrams for educational math worksheets. Return only valid SVG code, nothing else.' 
          },
          { 
            role: 'user', 
            content: `Generate a complete, valid SVG code for the following diagram. The SVG should be black lines on white background, suitable for a math worksheet. Return ONLY the SVG code, nothing else.

Diagram to create: ${enhancedPrompt}

Requirements:
- SVG should have width="300" height="300" viewBox="0 0 300 300"
- Use stroke="#000000" for all lines
- Use fill="none" for shapes, or fill="#ffffff" for white backgrounds
- Include clear text labels using <text> elements with font-size="14"
- Make sure the diagram is centered and well-proportioned`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Extract SVG from the response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      // Convert SVG to data URL
      const svgString = svgMatch[0];
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    }

    return null;
  } catch (error) {
    console.error('Error generating SVG with AI:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support presentation-style image generation
    if (body.prompt && (body.style === 'clipart' || body.style === 'presentation')) {
      console.log(`Generating ${body.style} image with Nano Banana (google/gemini-2.5-flash-image-preview)...`);
      
      const isPresentation = body.style === 'presentation';
      
      const clipartPrompt = isPresentation 
        ? `Generate a high-quality, photorealistic or professionally illustrated image for an educational classroom presentation.

Topic/Subject: ${body.prompt}

Image Requirements:
- Ultra high resolution, sharp and detailed
- Vibrant, rich colors with good contrast
- Professional educational illustration style
- Suitable for display on dark presentation backgrounds
- NO TEXT, NO LABELS, NO WORDS in the image
- Clean composition focused on the main subject
- Modern, engaging visual that captures student attention
- Think: National Geographic quality, textbook illustration quality`
        : `Generate a clean, simple clipart-style illustration.

Subject: ${body.prompt}

Requirements:
- Simple flat vector-style illustration
- Clean lines, minimal detail
- Suitable for presentations and educational materials
- Single object, centered composition
- Professional and friendly style
- NO TEXT or labels`;

      let imageUrl = await generateImageWithNanoBanana(clipartPrompt);
      
      // If Nano Banana fails, try SVG fallback (only for clipart style)
      if (!imageUrl && !isPresentation) {
        console.log('Nano Banana failed, trying SVG fallback...');
        imageUrl = await generateSVGWithAI(body.prompt);
      }
      
      // Return imageUrl (null is acceptable - frontend should handle gracefully)
      return new Response(
        JSON.stringify({ imageUrl: imageUrl || null, fallback: !imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Existing batch question image generation
    const { questions, useNanoBanana } = body as {
      questions: QuestionWithPrompt[];
      useNanoBanana?: boolean;
    };

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting image generation for ${questions.length} questions (Nano Banana: ${useNanoBanana})...`);

    const results: { questionNumber: number; imageUrl: string | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      
      let imageUrl: string | null = null;
      
      if (useNanoBanana) {
        // Use Nano Banana for realistic image generation
        imageUrl = await generateImageWithNanoBanana(q.imagePrompt);
      } else {
        // Use standard SVG generation
        imageUrl = await generateSVGWithAI(q.imagePrompt);
      }
      
      results.push({
        questionNumber: q.questionNumber,
        imageUrl
      });
      console.log(`Question ${q.questionNumber}: ${imageUrl ? 'Success' : 'Failed'}`);
    }

    const successCount = results.filter(r => r.imageUrl).length;
    console.log(`Completed: ${successCount}/${questions.length} images generated successfully`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-diagram-images:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate images';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});