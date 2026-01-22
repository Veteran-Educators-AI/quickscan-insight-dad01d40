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
❌ WRONG: Numbers placed inconsistently (some above, some below the axis)

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
- Vertex labels outside the shape, not inside.

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

// Detect shape type from prompt (polygons, circles, arcs)
function detectShapeType(prompt: string): { type: string; sides: number; isCircular: boolean } {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for circular shapes first
  if (lowerPrompt.includes('circle')) {
    return { type: 'circle', sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes('semicircle') || lowerPrompt.includes('semi-circle')) {
    return { type: 'semicircle', sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes('arc')) {
    return { type: 'arc', sides: 0, isCircular: true };
  }
  if (lowerPrompt.includes('ellipse') || lowerPrompt.includes('oval')) {
    return { type: 'ellipse', sides: 0, isCircular: true };
  }
  
  // Polygon types
  if (lowerPrompt.includes('triangle') || lowerPrompt.includes('3-gon')) {
    return { type: 'triangle', sides: 3, isCircular: false };
  }
  if (lowerPrompt.includes('quadrilateral') || lowerPrompt.includes('rectangle') || 
      lowerPrompt.includes('square') || lowerPrompt.includes('parallelogram') ||
      lowerPrompt.includes('rhombus') || lowerPrompt.includes('trapezoid') || lowerPrompt.includes('4-gon')) {
    return { type: 'quadrilateral', sides: 4, isCircular: false };
  }
  if (lowerPrompt.includes('pentagon') || lowerPrompt.includes('5-gon')) {
    return { type: 'pentagon', sides: 5, isCircular: false };
  }
  if (lowerPrompt.includes('hexagon') || lowerPrompt.includes('6-gon')) {
    return { type: 'hexagon', sides: 6, isCircular: false };
  }
  if (lowerPrompt.includes('heptagon') || lowerPrompt.includes('7-gon')) {
    return { type: 'heptagon', sides: 7, isCircular: false };
  }
  if (lowerPrompt.includes('octagon') || lowerPrompt.includes('8-gon')) {
    return { type: 'octagon', sides: 8, isCircular: false };
  }
  if (lowerPrompt.includes('line segment') || lowerPrompt.includes('segment')) {
    return { type: 'segment', sides: 2, isCircular: false };
  }
  if (lowerPrompt.includes('ray')) {
    return { type: 'ray', sides: 2, isCircular: false };
  }
  if (lowerPrompt.includes('line')) {
    return { type: 'line', sides: 2, isCircular: false };
  }
  
  // Default: infer from number of coordinates
  const coordCount = (prompt.match(/\(\d+,\s*\d+\)/g) || []).length;
  if (coordCount === 2) return { type: 'segment', sides: 2, isCircular: false };
  if (coordCount === 3) return { type: 'triangle', sides: 3, isCircular: false };
  if (coordCount === 4) return { type: 'quadrilateral', sides: 4, isCircular: false };
  if (coordCount === 5) return { type: 'pentagon', sides: 5, isCircular: false };
  if (coordCount === 6) return { type: 'hexagon', sides: 6, isCircular: false };
  
  return { type: 'polygon', sides: coordCount || 0, isCircular: false };
}

// Parse circle info from prompt (center point and radius)
function parseCircleInfo(prompt: string): { center: { x: number; y: number } | null; radius: number | null; startAngle?: number; endAngle?: number } {
  const lowerPrompt = prompt.toLowerCase();
  
  // Try to find center point: "center (5, 4)" or "centered at (5, 4)" or "center at C(5, 4)"
  const centerMatch = prompt.match(/center(?:ed)?(?:\s+at)?\s*(?:[A-Z])?\s*\((\d+),\s*(\d+)\)/i);
  let center: { x: number; y: number } | null = null;
  if (centerMatch) {
    center = { x: parseInt(centerMatch[1]), y: parseInt(centerMatch[2]) };
  }
  
  // Try to find radius: "radius 3" or "radius of 3" or "r = 3" or "r=3"
  const radiusMatch = prompt.match(/radius(?:\s+of)?\s*=?\s*(\d+(?:\.\d+)?)/i) || 
                      prompt.match(/r\s*=\s*(\d+(?:\.\d+)?)/i);
  let radius: number | null = null;
  if (radiusMatch) {
    radius = parseFloat(radiusMatch[1]);
  }
  
  // For arcs, try to find angles
  let startAngle = 0;
  let endAngle = 360;
  
  if (lowerPrompt.includes('semicircle') || lowerPrompt.includes('semi-circle')) {
    // Check orientation
    if (lowerPrompt.includes('upper') || lowerPrompt.includes('top')) {
      startAngle = 0;
      endAngle = 180;
    } else if (lowerPrompt.includes('lower') || lowerPrompt.includes('bottom')) {
      startAngle = 180;
      endAngle = 360;
    } else if (lowerPrompt.includes('left')) {
      startAngle = 90;
      endAngle = 270;
    } else if (lowerPrompt.includes('right')) {
      startAngle = -90;
      endAngle = 90;
    } else {
      // Default: upper semicircle
      startAngle = 0;
      endAngle = 180;
    }
  } else if (lowerPrompt.includes('arc')) {
    // Try to parse angle ranges: "arc from 30° to 120°" or "30 to 120 degrees"
    const angleMatch = prompt.match(/(\d+)\s*(?:°|degrees?)?\s*to\s*(\d+)\s*(?:°|degrees?)?/i);
    if (angleMatch) {
      startAngle = parseInt(angleMatch[1]);
      endAngle = parseInt(angleMatch[2]);
    } else {
      // Default: quarter arc
      startAngle = 0;
      endAngle = 90;
    }
  }
  
  return { center, radius, startAngle, endAngle };
}

// Generate deterministic SVG for all shape types on coordinate plane (guaranteed correct axis labels)
function generateDeterministicCoordinatePlaneSVG(prompt: string): string | null {
  // CRITICAL: Skip deterministic generation if prompt contains algebraic/variable coordinates
  // Variables like a, b, c, x, y, etc. indicate this is a proof problem, not a graphing problem
  const hasAlgebraicCoords = /\([a-z][\s,]|,\s*[a-z]\)|[a-z]\s*\+|[a-z]\s*-|[+-]\s*[a-z]|₂|²/i.test(prompt);
  if (hasAlgebraicCoords) {
    console.log('Detected algebraic/variable coordinates - skipping deterministic SVG generation');
    return null;
  }
  
  // IMPROVED: Parse ONLY explicitly labeled vertex coordinates (A(x,y), B(x,y), etc.)
  // Now supports NEGATIVE coordinates like P(-1, 5) or R(5, -3)
  const labeledVertexMatches = prompt.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/g) || [];
  
  // Use a Map to deduplicate labels - only keep the first occurrence of each label
  const labeledVerticesMap = new Map<string, { label: string; x: number; y: number }>();
  for (const match of labeledVertexMatches) {
    const parsed = match.match(/([A-Z])\s*\((-?\d+),\s*(-?\d+)\)/);
    if (parsed) {
      const label = parsed[1];
      // Only add if we haven't seen this label before
      if (!labeledVerticesMap.has(label)) {
        labeledVerticesMap.set(label, {
          label: label,
          x: parseInt(parsed[2]),
          y: parseInt(parsed[3])
        });
      }
    }
  }
  
  const labeledVertices = Array.from(labeledVerticesMap.values());
  
  // Extract coordinates and labels arrays from labeled vertices
  const coordinates = labeledVertices.map(v => ({ x: v.x, y: v.y }));
  const labels = labeledVertices.map(v => v.label);
  
  console.log(`Parsed ${labeledVertices.length} unique labeled vertices:`, labeledVertices.map(v => `${v.label}(${v.x}, ${v.y})`).join(', '));

  // Detect shape type
  const shapeInfo = detectShapeType(prompt);
  
  // For circular shapes, we need center and radius
  let circleInfo: ReturnType<typeof parseCircleInfo> | null = null;
  if (shapeInfo.isCircular) {
    circleInfo = parseCircleInfo(prompt);
    
    // If we have center in coordinates but not parsed, use first coordinate
    if (!circleInfo.center && coordinates.length > 0) {
      circleInfo.center = coordinates[0];
    }
    
    // Default radius if not specified
    if (!circleInfo.radius) {
      circleInfo.radius = 3; // Default radius
    }
    
    console.log(`Detected circular shape: ${shapeInfo.type}, center: (${circleInfo.center?.x}, ${circleInfo.center?.y}), radius: ${circleInfo.radius}`);
  } else {
    console.log(`Detected polygon type: ${shapeInfo.type} (${coordinates.length} vertices)`);
  }

  // For circular shapes without coordinates, we still need a center point
  if (shapeInfo.isCircular && circleInfo?.center) {
    // Continue with circle generation
  } else if (coordinates.length === 0) {
    return null; // Can't generate without coordinates
  }

  // Determine the coordinate range needed - SUPPORT NEGATIVE COORDINATES
  let minX = 0;
  let minY = 0;
  let maxX = 10;
  let maxY = 10;
  
  if (shapeInfo.isCircular && circleInfo?.center && circleInfo?.radius) {
    minX = Math.min(minX, circleInfo.center.x - circleInfo.radius - 2);
    minY = Math.min(minY, circleInfo.center.y - circleInfo.radius - 2);
    maxX = Math.max(maxX, circleInfo.center.x + circleInfo.radius + 2);
    maxY = Math.max(maxY, circleInfo.center.y + circleInfo.radius + 2);
  }
  if (coordinates.length > 0) {
    minX = Math.min(minX, ...coordinates.map(c => c.x - 2));
    minY = Math.min(minY, ...coordinates.map(c => c.y - 2));
    maxX = Math.max(maxX, ...coordinates.map(c => c.x + 2));
    maxY = Math.max(maxY, ...coordinates.map(c => c.y + 2));
  }
  
  // Calculate total range
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  // SVG dimensions and scaling - now supports negative coordinates
  const svgWidth = 320;
  const svgHeight = 320;
  const margin = 40;
  const plotWidth = svgWidth - 2 * margin;
  const plotHeight = svgHeight - 2 * margin;
  const scaleX = plotWidth / rangeX;
  const scaleY = plotHeight / rangeY;
  // Use uniform scaling for circles to prevent distortion
  const uniformScale = Math.min(scaleX, scaleY);

  // Helper to convert coordinates to SVG positions (now accounts for minX/minY offset)
  const toSvgX = (x: number) => margin + (x - minX) * scaleX;
  const toSvgY = (y: number) => svgHeight - margin - (y - minY) * scaleY; // Y is inverted in SVG

  // Build SVG parts
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
  
  <!-- Grid lines -->
  <g stroke="#e0e0e0" stroke-width="1">`;

  // Vertical grid lines (from minX to maxX)
  for (let x = minX; x <= maxX; x++) {
    svg += `\n    <line x1="${toSvgX(x)}" y1="${toSvgY(minY)}" x2="${toSvgX(x)}" y2="${toSvgY(maxY)}"/>`;
  }
  // Horizontal grid lines (from minY to maxY)
  for (let y = minY; y <= maxY; y++) {
    svg += `\n    <line x1="${toSvgX(minX)}" y1="${toSvgY(y)}" x2="${toSvgX(maxX)}" y2="${toSvgY(y)}"/>`;
  }

  svg += `\n  </g>
  
  <!-- Axes -->
  <g stroke="#000000" stroke-width="2">
    <!-- X-axis (at y=0, or at minY if 0 is not in range) -->
    <line x1="${toSvgX(minX) - 5}" y1="${toSvgY(0)}" x2="${toSvgX(maxX) + 10}" y2="${toSvgY(0)}"/>
    <!-- X-axis arrow -->
    <polygon points="${toSvgX(maxX) + 10},${toSvgY(0)} ${toSvgX(maxX) + 2},${toSvgY(0) - 4} ${toSvgX(maxX) + 2},${toSvgY(0) + 4}" fill="#000000"/>
    <!-- Y-axis (at x=0, or at minX if 0 is not in range) -->
    <line x1="${toSvgX(0)}" y1="${toSvgY(minY) + 5}" x2="${toSvgX(0)}" y2="${toSvgY(maxY) - 10}"/>
    <!-- Y-axis arrow -->
    <polygon points="${toSvgX(0)},${toSvgY(maxY) - 10} ${toSvgX(0) - 4},${toSvgY(maxY) - 2} ${toSvgX(0) + 4},${toSvgY(maxY) - 2}" fill="#000000"/>
  </g>
  
  <!-- Axis labels -->
  <g font-family="Arial, sans-serif" font-size="11" fill="#000000">
    <!-- X-axis label -->
    <text x="${toSvgX(maxX) + 15}" y="${toSvgY(0) + 4}" font-style="italic">x</text>
    <!-- Y-axis label -->
    <text x="${toSvgX(0) - 5}" y="${toSvgY(maxY) - 15}" font-style="italic">y</text>`;

  // X-axis numbers (from minX to maxX, including negative numbers)
  for (let x = minX; x <= maxX; x++) {
    // Skip 0 label if it overlaps with origin
    if (x === 0 && minY < 0 && maxY > 0) continue;
    svg += `\n    <text x="${toSvgX(x)}" y="${toSvgY(0) + 15}" text-anchor="middle">${x}</text>`;
  }

  // Y-axis numbers (from minY to maxY, including negative numbers)
  for (let y = minY; y <= maxY; y++) {
    if (y === 0) continue; // Skip 0 on Y-axis since it's on X-axis
    svg += `\n    <text x="${toSvgX(0) - 8}" y="${toSvgY(y) + 4}" text-anchor="end">${y}</text>`;
  }

  svg += `\n  </g>`;

  // Draw circular shapes (circles, arcs, semicircles)
  if (shapeInfo.isCircular && circleInfo?.center && circleInfo?.radius) {
    const cx = toSvgX(circleInfo.center.x);
    const cy = toSvgY(circleInfo.center.y);
    const rx = circleInfo.radius * scaleX;
    const ry = circleInfo.radius * scaleY;
    
    svg += `\n  
  <!-- ${shapeInfo.type.charAt(0).toUpperCase() + shapeInfo.type.slice(1)} -->`;
    
    if (shapeInfo.type === 'circle') {
      // Full circle
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
  </g>`;
    } else if (shapeInfo.type === 'ellipse') {
      // Ellipse (same as circle for now, but could support different rx/ry)
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
  </g>`;
    } else if (shapeInfo.type === 'semicircle' || shapeInfo.type === 'arc') {
      // Arc/Semicircle using SVG path
      const startAngle = circleInfo.startAngle || 0;
      const endAngle = circleInfo.endAngle || 180;
      
      // Convert angles to radians (SVG uses degrees but we calculate in radians)
      const startRad = (startAngle - 90) * Math.PI / 180; // -90 to start from top
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      // Calculate start and end points
      const x1 = cx + rx * Math.cos(startRad);
      const y1 = cy + ry * Math.sin(startRad);
      const x2 = cx + rx * Math.cos(endRad);
      const y2 = cy + ry * Math.sin(endRad);
      
      // Determine arc flags
      const angleDiff = endAngle - startAngle;
      const largeArcFlag = Math.abs(angleDiff) > 180 ? 1 : 0;
      const sweepFlag = angleDiff > 0 ? 1 : 0;
      
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <path d="M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}"/>
  </g>`;
    }
    
    // Add center point marker and label
    const centerLabel = labels[0] || 'C';
    svg += `
  <!-- Center point -->
  <g fill="#000000">
    <circle cx="${cx}" cy="${cy}" r="4"/>
    <text x="${cx + 10}" y="${cy - 10}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${centerLabel}(${circleInfo.center.x}, ${circleInfo.center.y})</text>
  </g>`;
    
    // Add radius line and label
    svg += `
  <!-- Radius line -->
  <g stroke="#000000" stroke-width="1.5" stroke-dasharray="4,2">
    <line x1="${cx}" y1="${cy}" x2="${cx + rx}" y2="${cy}"/>
  </g>
  <text x="${cx + rx/2}" y="${cy - 5}" font-family="Arial, sans-serif" font-size="10" text-anchor="middle">r = ${circleInfo.radius}</text>`;
  }

  // Draw polygon shapes (triangles, quadrilaterals, etc.)
  if (!shapeInfo.isCircular && coordinates.length >= 2) {
    svg += `\n  
  <!-- ${shapeInfo.type.charAt(0).toUpperCase() + shapeInfo.type.slice(1)} outline -->`;
    
    if (shapeInfo.type === 'segment') {
      // Line segment: just connect two points
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(coordinates[0].x)}" y1="${toSvgY(coordinates[0].y)}" 
          x2="${toSvgX(coordinates[1].x)}" y2="${toSvgY(coordinates[1].y)}"/>
  </g>`;
    } else if (shapeInfo.type === 'ray') {
      // Ray: start at first point, extend beyond second point
      const dx = coordinates[1].x - coordinates[0].x;
      const dy = coordinates[1].y - coordinates[0].y;
      const extendedX = coordinates[1].x + dx * 2;
      const extendedY = coordinates[1].y + dy * 2;
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(coordinates[0].x)}" y1="${toSvgY(coordinates[0].y)}" 
          x2="${toSvgX(Math.min(maxX, Math.max(0, extendedX)))}" y2="${toSvgY(Math.min(maxY, Math.max(0, extendedY)))}"/>
    <!-- Ray arrow -->
    <polygon points="${toSvgX(coordinates[1].x)},${toSvgY(coordinates[1].y) - 4} ${toSvgX(coordinates[1].x) - 4},${toSvgY(coordinates[1].y) + 4} ${toSvgX(coordinates[1].x) + 4},${toSvgY(coordinates[1].y) + 4}" fill="#000000"/>
  </g>`;
    } else if (shapeInfo.type === 'line') {
      // Line: extend in both directions
      const dx = coordinates[1].x - coordinates[0].x;
      const dy = coordinates[1].y - coordinates[0].y;
      const extendedX1 = coordinates[0].x - dx * 2;
      const extendedY1 = coordinates[0].y - dy * 2;
      const extendedX2 = coordinates[1].x + dx * 2;
      const extendedY2 = coordinates[1].y + dy * 2;
      svg += `
  <g stroke="#000000" stroke-width="2.5" fill="none">
    <line x1="${toSvgX(Math.min(maxX, Math.max(0, extendedX1)))}" y1="${toSvgY(Math.min(maxY, Math.max(0, extendedY1)))}" 
          x2="${toSvgX(Math.min(maxX, Math.max(0, extendedX2)))}" y2="${toSvgY(Math.min(maxY, Math.max(0, extendedY2)))}"/>
  </g>`;
    } else {
      // All polygons (triangles, quadrilaterals, pentagons, hexagons, etc.)
      svg += `
  <g stroke="#000000" stroke-width="2" fill="none">
    <polygon points="${coordinates.map(c => `${toSvgX(c.x)},${toSvgY(c.y)}`).join(' ')}"/>
  </g>`;
    }
  }

  // Plot polygon vertices and labels (skip for circles which have their own labeling)
  if (!shapeInfo.isCircular && coordinates.length > 0) {
    // Calculate centroid for smart label placement
    const centroidX = coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length;
    const centroidY = coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length;

    svg += `\n  
  <!-- Vertices -->
  <g fill="#000000">`;

    coordinates.forEach((coord, i) => {
      const label = labels[i] || String.fromCharCode(65 + i); // A, B, C, D, E, F...
      const labelX = toSvgX(coord.x);
      const labelY = toSvgY(coord.y);
      
      // Smart label positioning: place labels away from the centroid
      const dirX = coord.x - centroidX;
      const dirY = coord.y - centroidY;
      const magnitude = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      
      // Normalize and scale for label offset
      let textOffsetX = (dirX / magnitude) * 25;
      let textOffsetY = (dirY / magnitude) * -15; // Invert Y for SVG
      
      // Ensure minimum offset
      if (Math.abs(textOffsetX) < 10) textOffsetX = textOffsetX >= 0 ? 12 : -25;
      if (Math.abs(textOffsetY) < 8) textOffsetY = textOffsetY >= 0 ? -10 : 15;
      
      // Clamp offsets to keep labels in view
      textOffsetX = Math.max(-40, Math.min(15, textOffsetX));
      textOffsetY = Math.max(-15, Math.min(20, textOffsetY));

      svg += `\n    <!-- ${label}(${coord.x}, ${coord.y}) -->
    <circle cx="${labelX}" cy="${labelY}" r="4"/>
    <text x="${labelX + textOffsetX}" y="${labelY + textOffsetY}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${label}(${coord.x}, ${coord.y})</text>`;
    });

    svg += `\n  </g>`;

    // Add special annotations for certain polygon types
    if (shapeInfo.type === 'triangle' && coordinates.length === 3) {
      // Check for right angle markers
      const isRightTriangle = prompt.toLowerCase().includes('right');
      if (isRightTriangle) {
        // Find the right angle vertex (usually at the corner with perpendicular sides)
        // For now, add a small square at the first vertex as a right angle marker
        const rightVertex = coordinates[0];
        const size = 6;
        svg += `\n  
  <!-- Right angle marker -->
  <g stroke="#000000" stroke-width="1" fill="none">
    <polyline points="${toSvgX(rightVertex.x) + size},${toSvgY(rightVertex.y)} ${toSvgX(rightVertex.x) + size},${toSvgY(rightVertex.y) - size} ${toSvgX(rightVertex.x)},${toSvgY(rightVertex.y) - size}"/>
  </g>`;
      }
    }
  }

  svg += `
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