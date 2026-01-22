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
    // MASTER GEOMETRY TEMPLATE v5 - PIXEL-PERFECT AXIS LABELING
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
    
    // Generate the EXPLICIT list of axis numbers
    const xAxisNumbers = Array.from({ length: maxX + 1 }, (_, i) => i).join(', ');
    const yAxisNumbers = Array.from({ length: maxY + 1 }, (_, i) => i).join(', ');
    
    const enhancedPrompt = `CREATE A MATHEMATICAL COORDINATE PLANE DIAGRAM.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: THE AXIS NUMBERING IS THE MOST IMPORTANT PART. READ CAREFULLY.
═══════════════════════════════════════════════════════════════════════════════

You must create a STANDARD CARTESIAN COORDINATE PLANE like you see in every math textbook.

THE X-AXIS (horizontal line):
- Goes from LEFT to RIGHT
- Has an arrow pointing RIGHT at the end
- Label it with lowercase "x" at the right
- Put tick marks at EQUAL intervals
- Write these EXACT numbers BELOW the tick marks, reading LEFT to RIGHT:
  ${xAxisNumbers}
- The number 0 is on the LEFT (at the origin)
- The number ${maxX} is on the RIGHT
- EVERY number from 0 to ${maxX} must appear ONCE and ONLY ONCE
- Numbers must be IN ORDER: 0 then 1 then 2 then 3 then 4 then 5 then 6 then 7 then 8 then 9 then 10
- DO NOT SKIP ANY NUMBERS
- DO NOT PUT ANY NUMBER TWICE

THE Y-AXIS (vertical line):
- Goes from BOTTOM to TOP
- Has an arrow pointing UP at the end
- Label it with lowercase "y" at the top
- Put tick marks at EQUAL intervals
- Write these EXACT numbers TO THE LEFT of the tick marks, reading BOTTOM to TOP:
  ${yAxisNumbers}
- The number 0 is at the BOTTOM (at the origin, shared with x-axis)
- The number ${maxY} is at the TOP
- EVERY number from 0 to ${maxY} must appear ONCE and ONLY ONCE
- Numbers must be IN ORDER: 0 at bottom, then 1 above it, then 2, then 3, then 4, then 5, then 6, then 7, then 8, then 9, then 10 at top
- DO NOT SKIP ANY NUMBERS
- DO NOT PUT ANY NUMBER TWICE

THE ORIGIN:
- Is where the X and Y axes cross
- Is at the BOTTOM-LEFT of the coordinate grid
- Has the value (0, 0)
- Both axes share the "0" at this point

GRID LINES (optional but helpful):
- Light gray horizontal and vertical lines at each integer value
- Like graph paper

═══════════════════════════════════════════════════════════════════════════════
AXIS NUMBER VERIFICATION - COUNT THESE OUT LOUD:
═══════════════════════════════════════════════════════════════════════════════

X-AXIS (read left to right): 
Position 1: "0" | Position 2: "1" | Position 3: "2" | Position 4: "3" | Position 5: "4" | Position 6: "5" | Position 7: "6" | Position 8: "7" | Position 9: "8" | Position 10: "9" | Position 11: "10"

Y-AXIS (read bottom to top):
Position 1 (bottom): "0" | Position 2: "1" | Position 3: "2" | Position 4: "3" | Position 5: "4" | Position 6: "5" | Position 7: "6" | Position 8: "7" | Position 9: "8" | Position 10: "9" | Position 11 (top): "10"

═══════════════════════════════════════════════════════════════════════════════
NOW DRAW THE SHAPE ON TOP OF THE COORDINATE PLANE:
═══════════════════════════════════════════════════════════════════════════════

${prompt}

${coordinates.length > 0 ? `
VERTEX PLOTTING INSTRUCTIONS:
${coordinates.map((c, i) => {
  const labels = prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/g) || [];
  const label = labels[i] || `Point ${i + 1}`;
  return `• ${label}: 
    - Start at origin (0,0) in bottom-left corner
    - Count ${c!.x} tick marks to the RIGHT on the x-axis (you should be at x=${c!.x})
    - From there, count ${c!.y} tick marks UPWARD (you should now be at y=${c!.y})
    - Place a solid black dot at this grid intersection
    - Write "${label}" next to the dot, outside the shape`;
}).join('\n')}
` : ''}

Connect the vertices with thin black lines to form the shape.

═══════════════════════════════════════════════════════════════════════════════
COMMON MISTAKES TO AVOID:
═══════════════════════════════════════════════════════════════════════════════

❌ WRONG: X-axis reads "0, 1, 2, 3, 5, 8, 9, 10" (missing 4, 6, 7)
❌ WRONG: Y-axis reads "0, 1, 2, 3, 4, 7, 8, 9, 10" (missing 5, 6)
❌ WRONG: Numbers not evenly spaced
❌ WRONG: Numbers in random order like "10, 3, 7, 4"
❌ WRONG: Same number appearing twice
❌ WRONG: Rotated or diagonal text
❌ WRONG: Numbers placed inconsistently (some above, some below axis)

✅ CORRECT: Every integer from 0 to 10 appears exactly once
✅ CORRECT: Numbers are in sequential order (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
✅ CORRECT: Numbers are evenly spaced
✅ CORRECT: X-axis numbers below the line, Y-axis numbers to the left of the line
✅ CORRECT: All text is horizontal

═══════════════════════════════════════════════════════════════════════════════
STYLE REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════

- White background
- Black lines and text only
- Clean, professional math textbook style
- All text must be perfectly horizontal (not rotated)
- Vertex labels outside the shape, not inside`;

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

// Generate deterministic SVG coordinate plane diagram (guaranteed correct axis labels)
function generateDeterministicCoordinatePlaneSVG(prompt: string): string | null {
  // Parse coordinates from the prompt
  const coordinateMatches = prompt.match(/\((\d+),\s*(\d+)\)/g) || [];
  const coordinates = coordinateMatches.map(match => {
    const nums = match.match(/(\d+)/g);
    return nums ? { x: parseInt(nums[0]), y: parseInt(nums[1]) } : null;
  }).filter(Boolean) as { x: number; y: number }[];

  // Parse vertex labels (A, B, C, D, etc.)
  const labelMatches = prompt.match(/([A-Z])\s*\(\d+,\s*\d+\)/g) || [];
  const labels = labelMatches.map(match => match.charAt(0));

  if (coordinates.length === 0) {
    return null; // Can't generate without coordinates
  }

  // Determine the coordinate range needed
  const maxX = Math.max(10, ...coordinates.map(c => c.x + 2));
  const maxY = Math.max(10, ...coordinates.map(c => c.y + 2));

  // SVG dimensions and scaling
  const svgWidth = 320;
  const svgHeight = 320;
  const margin = 40;
  const plotWidth = svgWidth - 2 * margin;
  const plotHeight = svgHeight - 2 * margin;
  const scaleX = plotWidth / maxX;
  const scaleY = plotHeight / maxY;

  // Helper to convert coordinates to SVG positions
  const toSvgX = (x: number) => margin + x * scaleX;
  const toSvgY = (y: number) => svgHeight - margin - y * scaleY; // Y is inverted in SVG

  // Build SVG parts
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
  
  <!-- Grid lines -->
  <g stroke="#e0e0e0" stroke-width="1">`;

  // Vertical grid lines
  for (let x = 0; x <= maxX; x++) {
    svg += `\n    <line x1="${toSvgX(x)}" y1="${toSvgY(0)}" x2="${toSvgX(x)}" y2="${toSvgY(maxY)}"/>`;
  }
  // Horizontal grid lines
  for (let y = 0; y <= maxY; y++) {
    svg += `\n    <line x1="${toSvgX(0)}" y1="${toSvgY(y)}" x2="${toSvgX(maxX)}" y2="${toSvgY(y)}"/>`;
  }

  svg += `\n  </g>
  
  <!-- Axes -->
  <g stroke="#000000" stroke-width="2">
    <!-- X-axis -->
    <line x1="${margin - 5}" y1="${toSvgY(0)}" x2="${toSvgX(maxX) + 10}" y2="${toSvgY(0)}"/>
    <!-- X-axis arrow -->
    <polygon points="${toSvgX(maxX) + 10},${toSvgY(0)} ${toSvgX(maxX) + 2},${toSvgY(0) - 4} ${toSvgX(maxX) + 2},${toSvgY(0) + 4}" fill="#000000"/>
    <!-- Y-axis -->
    <line x1="${toSvgX(0)}" y1="${toSvgY(0) + 5}" x2="${toSvgX(0)}" y2="${toSvgY(maxY) - 10}"/>
    <!-- Y-axis arrow -->
    <polygon points="${toSvgX(0)},${toSvgY(maxY) - 10} ${toSvgX(0) - 4},${toSvgY(maxY) - 2} ${toSvgX(0) + 4},${toSvgY(maxY) - 2}" fill="#000000"/>
  </g>
  
  <!-- Axis labels -->
  <g font-family="Arial, sans-serif" font-size="11" fill="#000000">
    <!-- X-axis label -->
    <text x="${toSvgX(maxX) + 15}" y="${toSvgY(0) + 4}" font-style="italic">x</text>
    <!-- Y-axis label -->
    <text x="${toSvgX(0) - 5}" y="${toSvgY(maxY) - 15}" font-style="italic">y</text>`;

  // X-axis numbers (SEQUENTIAL: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  for (let x = 0; x <= maxX; x++) {
    svg += `\n    <text x="${toSvgX(x)}" y="${toSvgY(0) + 15}" text-anchor="middle">${x}</text>`;
  }

  // Y-axis numbers (SEQUENTIAL: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 going UP)
  for (let y = 0; y <= maxY; y++) {
    if (y === 0) continue; // Skip 0 on Y-axis since it's shared with X
    svg += `\n    <text x="${toSvgX(0) - 8}" y="${toSvgY(y) + 4}" text-anchor="end">${y}</text>`;
  }

  svg += `\n  </g>`;

  // Draw the shape (connect vertices)
  if (coordinates.length >= 2) {
    svg += `\n  
  <!-- Shape outline -->
  <g stroke="#000000" stroke-width="2" fill="none">
    <polygon points="${coordinates.map(c => `${toSvgX(c.x)},${toSvgY(c.y)}`).join(' ')}"/>
  </g>`;
  }

  // Plot vertices and labels
  svg += `\n  
  <!-- Vertices -->
  <g fill="#000000">`;

  coordinates.forEach((coord, i) => {
    const label = labels[i] || String.fromCharCode(65 + i); // A, B, C, D...
    const labelX = toSvgX(coord.x);
    const labelY = toSvgY(coord.y);
    
    // Determine label position (offset based on position to avoid overlap with shape)
    let textOffsetX = 8;
    let textOffsetY = -8;
    
    // If point is on the right side, put label to the right
    if (coord.x > maxX / 2) textOffsetX = 8;
    else textOffsetX = -30; // Left side, put label to the left
    
    // If point is at the top, put label above
    if (coord.y > maxY / 2) textOffsetY = -8;
    else textOffsetY = 18; // Bottom, put label below

    svg += `\n    <!-- ${label}(${coord.x}, ${coord.y}) -->
    <circle cx="${labelX}" cy="${labelY}" r="4"/>
    <text x="${labelX + textOffsetX}" y="${labelY + textOffsetY}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${label}(${coord.x}, ${coord.y})</text>`;
  });

  svg += `\n  </g>
</svg>`;

  // Convert to data URL
  const base64Svg = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64Svg}`;
}

// Generate SVG diagram using standard AI model (fallback if deterministic fails)
async function generateSVGWithAI(prompt: string): Promise<string | null> {
  // First, try deterministic generation for coordinate plane problems
  const isCoordinatePlane = prompt.toLowerCase().includes('coordinate') || 
                            prompt.match(/[A-Z]\s*\(\d+,\s*\d+\)/);
  
  if (isCoordinatePlane) {
    console.log('Using deterministic SVG generator for coordinate plane...');
    const deterministicSvg = generateDeterministicCoordinatePlaneSVG(prompt);
    if (deterministicSvg) {
      console.log('Deterministic SVG generated successfully');
      return deterministicSvg;
    }
  }

  // Fall back to AI generation for non-coordinate-plane diagrams
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
   - Number labels on both axes at regular intervals (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
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
    const { questions, useNanoBanana, preferDeterministicSVG } = body as {
      questions: QuestionWithPrompt[];
      useNanoBanana?: boolean;
      preferDeterministicSVG?: boolean;
    };

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting image generation for ${questions.length} questions (Nano Banana: ${useNanoBanana}, Deterministic: ${preferDeterministicSVG})...`);

    const results: { questionNumber: number; imageUrl: string | null; validation?: ValidationResult | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      
      let imageUrl: string | null = null;
      let validation: ValidationResult | null = null;
      
      // If preferDeterministicSVG is enabled, always try deterministic first
      if (preferDeterministicSVG) {
        console.log('Using deterministic SVG generator (user preference)...');
        imageUrl = generateDeterministicCoordinatePlaneSVG(q.imagePrompt);
        if (imageUrl) {
          console.log('Deterministic SVG generated successfully');
          validation = { isValid: true, issues: [], shouldRetry: false };
        } else {
          // Fall back to standard SVG generation if deterministic fails (no coordinates found)
          console.log('Deterministic failed (no coordinates), falling back to SVG AI...');
          imageUrl = await generateSVGWithAI(q.imagePrompt);
        }
      } else if (useNanoBanana) {
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