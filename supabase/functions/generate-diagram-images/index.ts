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
    // MASTER GEOMETRY TEMPLATE v2 - Strict, Simple, Explicit
    // ═══════════════════════════════════════════════════════════════════════════════
    const enhancedPrompt = `Create a simple, clean mathematical diagram.

WHAT TO DRAW:
${prompt}

═══════════════════════════════════════════════════════════════════════════════
STRICT RULES - FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

RULE 1: STYLE
- Plain white background
- Black lines only (no colors, no shading, no gradients)
- Clean sans-serif font for all text
- Simple and minimal - like a textbook diagram

RULE 2: COORDINATE PLANE (if needed)
- Draw x-axis as a horizontal line with arrow pointing RIGHT
- Draw y-axis as a vertical line with arrow pointing UP
- Label "x" at the right end of x-axis
- Label "y" at the top of y-axis
- Put small tick marks at each integer
- Write the numbers BELOW the x-axis ticks
- Write the numbers to the LEFT of y-axis ticks
- The origin (0,0) is where the axes cross

RULE 3: PLOTTING POINTS
- Draw each point as a SOLID BLACK DOT
- Write the point label NEXT TO the dot (not on top of it)
- Format: Letter followed by coordinates, like "A(1, 1)" or "B(7, 1)"
- Each point gets ONE label only - do not repeat labels

RULE 4: SHAPES ON COORDINATE PLANE
- Connect the vertices with straight black lines
- The shape should be clearly visible
- Label each vertex ONCE with its letter and coordinates
- Place vertex labels OUTSIDE the shape, near each corner

RULE 5: MEASUREMENTS (if showing lengths)
- Write measurements OUTSIDE the shape, parallel to the side
- Include units: "6 units" or "3 units"
- Do NOT clutter - only show measurements that are asked for

═══════════════════════════════════════════════════════════════════════════════
DO NOT DO THESE THINGS
═══════════════════════════════════════════════════════════════════════════════
- DO NOT use colors or shading
- DO NOT repeat the same vertex label twice
- DO NOT put labels inside the shape
- DO NOT add extra arrows or decorations
- DO NOT add elements that were not requested
- DO NOT make it cluttered or confusing
- DO NOT use fancy fonts or styling

═══════════════════════════════════════════════════════════════════════════════
QUALITY CHECK
═══════════════════════════════════════════════════════════════════════════════
Before finishing, verify:
✓ Each vertex has exactly ONE label
✓ All coordinates match what was requested
✓ The shape is clearly visible
✓ Labels are readable and positioned outside the shape
✓ The diagram is clean and simple`;

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