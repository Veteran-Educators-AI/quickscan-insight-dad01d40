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

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  shouldRetry: boolean;
}

// Validate generated image using AI vision
async function validateDiagramImage(imageUrl: string, originalPrompt: string): Promise<ValidationResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return { isValid: true, issues: [], shouldRetry: false }; // Skip validation if no key
  }

  try {
    console.log('Validating generated diagram...');
    
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this mathematical diagram for quality issues. Check for these SPECIFIC problems:

COORDINATE PLANE ISSUES:
- Are the Y-axis numbers in correct order (0,1,2,3... going UP)?
- Are the X-axis numbers in correct order (0,1,2,3... going RIGHT)?
- Are axis numbers scattered randomly instead of evenly spaced?

LABEL ISSUES:
- Are any vertex labels duplicated (same letter appears twice)?
- Are labels placed inside shapes instead of outside?
- Is text rotated/diagonal when it should be horizontal?
- Are there unwanted "units" labels cluttering the diagram?

SHAPE ISSUES:
- Is the shape clearly visible on the coordinate plane?
- Are vertices plotted at approximately correct positions?

Respond with ONLY a JSON object in this exact format:
{
  "isValid": true/false,
  "issues": ["list of specific issues found"],
  "shouldRetry": true/false
}

Set shouldRetry=true if the diagram has major issues that would confuse students.
Set isValid=false if there are ANY of the issues listed above.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('Validation API error:', response.status);
      return { isValid: true, issues: [], shouldRetry: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as ValidationResult;
      console.log('Validation result:', result);
      return result;
    }
    
    return { isValid: true, issues: [], shouldRetry: false };
  } catch (error) {
    console.error('Validation error:', error);
    return { isValid: true, issues: [], shouldRetry: false };
  }
}

// Generate image using Nano Banana (google/gemini-2.5-flash-image-preview)
async function generateImageWithNanoBanana(prompt: string, attemptNumber = 1): Promise<{ imageUrl: string | null; validation: ValidationResult | null }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return { imageUrl: null, validation: null };
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════════════
    // MASTER GEOMETRY TEMPLATE v3 - LAYERED RENDERING APPROACH
    // ═══════════════════════════════════════════════════════════════════════════════
    const enhancedPrompt = `Create a simple, clean mathematical diagram using LAYERED RENDERING.

═══════════════════════════════════════════════════════════════════════════════
STEP 1: DRAW THE COORDINATE PLANE FIRST (BASE LAYER)
═══════════════════════════════════════════════════════════════════════════════
Before drawing ANY shape, create a complete coordinate plane:
1. White background
2. Draw X-AXIS: horizontal black line with arrow pointing RIGHT, label "x" at arrow
3. Draw Y-AXIS: vertical black line with arrow pointing UP, label "y" at arrow  
4. Add tick marks at integers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
5. X-axis numbers go BELOW the axis, evenly spaced LEFT to RIGHT
6. Y-axis numbers go to the LEFT of the axis, evenly spaced BOTTOM to TOP
7. Origin is labeled "0" only ONCE (at the corner where axes meet)
8. Optional: light gray grid lines

THE COORDINATE PLANE MUST BE COMPLETE AND CORRECT BEFORE STEP 2.

═══════════════════════════════════════════════════════════════════════════════
STEP 2: DRAW THE SHAPE ON TOP (OVERLAY LAYER)
═══════════════════════════════════════════════════════════════════════════════
After the coordinate plane is complete:
1. Plot each vertex as a SMALL SOLID BLACK DOT at the correct coordinates
2. Connect vertices with THIN BLACK LINES to form the shape
3. Label each vertex ONCE with letter and coordinates: A(1, 4)
4. Place labels OUTSIDE the shape, near the dot

═══════════════════════════════════════════════════════════════════════════════
WHAT TO DRAW ON THIS COORDINATE PLANE:
═══════════════════════════════════════════════════════════════════════════════
${prompt}

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE RULES - DO NOT BREAK THESE
═══════════════════════════════════════════════════════════════════════════════
- Y-axis numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 going UP (not scattered)
- X-axis numbers: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 going RIGHT (not scattered)
- All text is HORIZONTAL (no rotated or diagonal text)
- NO "units" labels on the shape sides unless explicitly requested
- NO duplicate labels
- NO colors or shading (black and white only)
- Labels are positioned OUTSIDE shapes, not inside

═══════════════════════════════════════════════════════════════════════════════
FINAL VERIFICATION
═══════════════════════════════════════════════════════════════════════════════
✓ Coordinate plane is drawn FIRST with correct axis numbering
✓ Shape is drawn ON TOP of the coordinate plane
✓ Each vertex has exactly ONE label
✓ All text is horizontal and readable`;

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
      return { imageUrl: null, validation: null };
    }

    const data = await response.json();
    console.log('Nano Banana response received');
    
    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log('Successfully generated image with Nano Banana');
        
        // Validate the generated image (only for geometry diagrams, max 2 retries)
        const isGeometryPrompt = prompt.toLowerCase().includes('coordinate') || 
                                  prompt.toLowerCase().includes('vertex') ||
                                  prompt.toLowerCase().includes('triangle') ||
                                  prompt.toLowerCase().includes('quadrilateral');
        
        if (isGeometryPrompt && attemptNumber <= 2) {
          const validation = await validateDiagramImage(imageUrl, prompt);
          
          if (validation.shouldRetry && attemptNumber < 2) {
            console.log(`Validation failed (attempt ${attemptNumber}), retrying...`, validation.issues);
            return generateImageWithNanoBanana(prompt, attemptNumber + 1);
          }
          
          return { imageUrl, validation };
        }
        
        return { imageUrl, validation: null };
      }
    }

    console.log('No image in Nano Banana response');
    return { imageUrl: null, validation: null };
  } catch (error) {
    console.error('Error generating with Nano Banana:', error);
    return { imageUrl: null, validation: null };
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

      const result = await generateImageWithNanoBanana(clipartPrompt);
      let imageUrl = result.imageUrl;
      
      // If Nano Banana fails, try SVG fallback (only for clipart style)
      if (!imageUrl && !isPresentation) {
        console.log('Nano Banana failed, trying SVG fallback...');
        imageUrl = await generateSVGWithAI(body.prompt);
      }
      
      // Return imageUrl (null is acceptable - frontend should handle gracefully)
      return new Response(
        JSON.stringify({ imageUrl: imageUrl || null, fallback: !imageUrl, validation: result.validation }),
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

    const results: { questionNumber: number; imageUrl: string | null; validation?: ValidationResult | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      
      let imageUrl: string | null = null;
      let validation: ValidationResult | null = null;
      
      if (useNanoBanana) {
        // Use Nano Banana for realistic image generation with validation
        const result = await generateImageWithNanoBanana(q.imagePrompt);
        imageUrl = result.imageUrl;
        validation = result.validation;
      } else {
        // Use standard SVG generation
        imageUrl = await generateSVGWithAI(q.imagePrompt);
      }
      
      results.push({
        questionNumber: q.questionNumber,
        imageUrl,
        validation
      });
      
      const validationStatus = validation ? (validation.isValid ? '✓ Valid' : `⚠ Issues: ${validation.issues.join(', ')}`) : '';
      console.log(`Question ${q.questionNumber}: ${imageUrl ? 'Success' : 'Failed'} ${validationStatus}`);
    }

    const successCount = results.filter(r => r.imageUrl).length;
    const validCount = results.filter(r => r.validation?.isValid !== false).length;
    console.log(`Completed: ${successCount}/${questions.length} images generated, ${validCount} passed validation`);

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