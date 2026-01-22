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
    // MASTER GEOMETRY TEMPLATE v4 - ULTRA-PRESCRIPTIVE COORDINATE PLANE APPROACH
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Parse coordinates from the prompt to provide explicit placement instructions
    const coordinateMatches = prompt.match(/\((\d+),\s*(\d+)\)/g) || [];
    const coordinates = coordinateMatches.map(match => {
      const nums = match.match(/(\d+)/g);
      return nums ? { x: parseInt(nums[0]), y: parseInt(nums[1]) } : null;
    }).filter(Boolean);
    
    // Determine the coordinate range needed
    const maxX = Math.max(10, ...coordinates.map(c => c!.x + 1));
    const maxY = Math.max(10, ...coordinates.map(c => c!.y + 1));
    
    const enhancedPrompt = `You are creating a PRECISE mathematical coordinate plane diagram. Follow these instructions EXACTLY.

════════════════════════════════════════════════════════════════════════════════
PHASE 1: DRAW THE COORDINATE PLANE (this MUST be done FIRST and CORRECTLY)
════════════════════════════════════════════════════════════════════════════════

Create a standard Cartesian coordinate plane with these EXACT specifications:

BACKGROUND: Pure white, clean

X-AXIS (HORIZONTAL):
- Draw a horizontal black line from left edge to right edge
- Place an arrowhead at the RIGHT end pointing right
- Write lowercase "x" next to the arrowhead
- Add ${maxX} evenly-spaced tick marks along this axis
- BELOW each tick mark, write the numbers in this EXACT sequence from left to right:
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9${maxX > 10 ? `, 10, ...${maxX}` : ', 10'}
- The "0" is at the LEFT where the axes meet (the origin)
- Numbers INCREASE as you go RIGHT

Y-AXIS (VERTICAL):
- Draw a vertical black line from bottom edge to top edge
- Place an arrowhead at the TOP end pointing up
- Write lowercase "y" next to the arrowhead
- Add ${maxY} evenly-spaced tick marks along this axis
- To the LEFT of each tick mark, write the numbers in this EXACT sequence from bottom to top:
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9${maxY > 10 ? `, 10, ...${maxY}` : ', 10'}
- The "0" is at the BOTTOM where the axes meet (shared with x-axis origin)
- Numbers INCREASE as you go UP

CRITICAL AXIS RULE:
- The ORIGIN (0,0) is at the BOTTOM-LEFT corner where both axes meet
- Numbers get LARGER going RIGHT on X-axis
- Numbers get LARGER going UP on Y-axis
- This is the STANDARD mathematical convention

OPTIONAL: Light gray grid lines connecting tick marks (like graph paper)

════════════════════════════════════════════════════════════════════════════════
PHASE 2: PLOT THE SHAPE (only AFTER the coordinate plane is complete)
════════════════════════════════════════════════════════════════════════════════

${prompt}

FOR EACH VERTEX COORDINATE (x, y):
- Find x on the horizontal axis (count from 0 at left)
- Find y on the vertical axis (count from 0 at bottom)
- Place a SMALL SOLID BLACK DOT where the vertical line from x meets the horizontal line from y
- Write the label (like "A(1, 4)") NEAR the dot but OUTSIDE the shape

CONNECTING VERTICES:
- Draw straight black lines between adjacent vertices to form the shape
- Lines should be thin and clean

════════════════════════════════════════════════════════════════════════════════
EXPLICIT COORDINATE POSITIONS FROM THIS PROBLEM:
════════════════════════════════════════════════════════════════════════════════
${coordinates.length > 0 ? coordinates.map((c, i) => {
  const labels = prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/g) || [];
  const label = labels[i] || `Point ${i + 1}`;
  return `• ${label}: Go ${c!.x} units RIGHT from origin on x-axis, then ${c!.y} units UP on y-axis`;
}).join('\n') : 'Plot points at the exact coordinates specified in the problem.'}

════════════════════════════════════════════════════════════════════════════════
ABSOLUTE REQUIREMENTS - VIOLATION = FAILURE
════════════════════════════════════════════════════════════════════════════════
✗ DO NOT put random/scattered numbers on axes - they MUST be sequential (0,1,2,3...)
✗ DO NOT repeat axis numbers (no two "10"s, no two "4"s, etc.)
✗ DO NOT put numbers in wrong order (like 10,3,7,4 - WRONG!)
✗ DO NOT rotate text - ALL text must be horizontal and readable
✗ DO NOT label the same vertex twice
✗ DO NOT use colors - black lines on white background ONLY
✗ DO NOT write "units" on shape edges unless specifically asked

✓ Y-axis: 0 at BOTTOM, numbers INCREASE going UP (0,1,2,3,4,5,6,7,8,9,10)
✓ X-axis: 0 at LEFT, numbers INCREASE going RIGHT (0,1,2,3,4,5,6,7,8,9,10)
✓ Origin (0,0) is at BOTTOM-LEFT corner
✓ Each vertex has exactly ONE label positioned outside the shape
✓ All text is horizontal

════════════════════════════════════════════════════════════════════════════════
QUALITY CHECK BEFORE FINISHING
════════════════════════════════════════════════════════════════════════════════
□ X-axis numbers read "0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10" left to right? 
□ Y-axis numbers read "0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10" bottom to top?
□ Each point is plotted at the correct grid intersection?
□ All labels are horizontal and near (but outside) the shape?`;

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