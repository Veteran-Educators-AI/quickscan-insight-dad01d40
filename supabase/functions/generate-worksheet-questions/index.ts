import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TopicInput {
  topicName: string;
  standard: string;
  subject: string;
  category: string;
}

// Bloom's Taxonomy Cognitive Levels (lowest to highest)
type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type WorksheetMode = 'practice' | 'basic_assessment' | 'diagnostic';

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: 'medium' | 'hard' | 'challenging';
  bloomLevel: BloomLevel;
  bloomVerb: string; // The action verb used (e.g., "identify", "compare", "design")
  advancementLevel?: AdvancementLevel;
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

async function callLovableAI(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `You are an expert math educator creating textbook-quality problems. 

CRITICAL FORMATTING REQUIREMENTS:
- Use proper mathematical Unicode symbols in ALL questions:
  • Use π (not "pi" or "3.14")
  • Use √ for square roots (e.g., √2, √3)
  • Use ² ³ ⁴ for exponents (e.g., x², y³, r⁴)
  • Use ° for degrees (e.g., 45°, 90°)
  • Use ∠ for angles (e.g., ∠ABC)
  • Use ≤ ≥ ≠ for inequalities
  • Use × for multiplication in expressions
  • Use ÷ for division where appropriate
  • Use θ for angle theta
  • Use ½ ⅓ ¼ ⅔ ¾ for common fractions
  • Use ⊥ for perpendicular
  • Use ∥ for parallel
  • Use △ for triangle notation (e.g., △ABC)
  • Use ≅ for congruent
  • Use ~ for similar
  
Write questions in a fluid, professional textbook style - complete sentences, clear mathematical language, and elegant formatting.

Return only valid JSON arrays when asked for questions.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate limit exceeded. Please try again in a moment.' };
    }
    if (response.status === 402) {
      throw { status: 402, message: 'AI credits exhausted. Please add funds to continue.' };
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in AI response');
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics, questionCount, difficultyLevels, bloomLevels, includeGeometry, includeFormulas, includeGraphPaper, includeCoordinateGeometry, useAIImages, worksheetMode } = await req.json() as {
      topics: TopicInput[];
      questionCount: number;
      difficultyLevels?: string[];
      bloomLevels?: BloomLevel[];
      includeGeometry?: boolean;
      includeFormulas?: boolean;
      includeGraphPaper?: boolean;
      includeCoordinateGeometry?: boolean;
      useAIImages?: boolean;
      worksheetMode?: WorksheetMode;
    };

    if (!topics || topics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No topics provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt
    const topicsList = topics.map((t, i) => 
      `${i + 1}. Topic: "${t.topicName}" (Standard: ${t.standard}, Subject: ${t.subject}, Category: ${t.category})`
    ).join('\n');

    const questionsPerTopic = Math.ceil(questionCount / topics.length);
    const allowedDifficulties = difficultyLevels && difficultyLevels.length > 0 
      ? difficultyLevels 
      : ['medium', 'hard', 'challenging'];
    const difficultyInstruction = `Only generate questions with these difficulty levels: ${allowedDifficulties.join(', ')}.`;

    // Bloom's Taxonomy filter
    const allowedBloomLevels = bloomLevels && bloomLevels.length > 0 
      ? bloomLevels 
      : ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    const bloomInstruction = `ONLY generate questions for these Bloom's Taxonomy cognitive levels: ${allowedBloomLevels.join(', ')}. Do NOT include questions from other cognitive levels.`;

    // Build optional instructions for geometry and formulas
    let geometryInstruction = '';
    if (includeGeometry) {
      if (useAIImages) {
        geometryInstruction = `
8. For geometry-related questions, you MUST include an "imagePrompt" field with a detailed description of the diagram/image needed.
   - The imagePrompt should describe what visual diagram would help students understand the question
   - Be specific about shapes, labels, measurements, angles, and any text that should appear
   - Examples of prompts:
     * "A right triangle ABC with right angle at C, hypotenuse AB labeled 10cm, and angle A labeled 30 degrees"
     * "A circle with center O, radius 5, and a chord AB with midpoint M, showing the perpendicular from O to AB"
     * "A coordinate plane with x and y axes, showing points A(2,3) and B(-1,4) connected by a line segment"
     * "A rectangular prism with dimensions 4x3x2, showing dashed hidden edges"
   - Make the prompts clear and educational, suitable for a math worksheet`;
      } else {
        geometryInstruction = `
8. For geometry-related questions, you MUST include an "svg" field with a complete, valid SVG string that visually represents the geometric figure described in the question.
   - The SVG should be self-contained with width="200" height="200" viewBox="0 0 200 200"
   - Use clear colors: stroke="#1f2937" (dark gray) for lines, fill="none" or fill="#e5e7eb" for shapes
   - Include labels for vertices, angles, or measurements using <text> elements
   - Examples of shapes to draw:
     * Triangles with labeled vertices (A, B, C)
     * Circles with radius lines and center points
     * Quadrilaterals (rectangles, squares, parallelograms, trapezoids)
     * Coordinate grids with plotted points
     * Angle diagrams with arc indicators
     * 3D shapes like cubes, prisms, pyramids (using isometric projections)
   - Make sure the SVG is clean, properly formatted, and renders correctly
   - For coordinate geometry, include axis lines and grid marks`;
      }
    }

    let formulasInstruction = '';
    if (includeFormulas) {
      formulasInstruction = `
${includeGeometry ? '9' : '8'}. Include mathematical formulas and expressions in your questions:
   - Use standard mathematical notation (e.g., "x² + 2x + 1 = 0", "sin(θ) = opposite/hypotenuse")
   - Reference formulas like quadratic formula, Pythagorean theorem, area/volume formulas
   - Include problems that require students to apply or derive formulas
   - Use proper mathematical symbols where appropriate (√, π, ², ³, etc.)`;
    }

    let graphPaperInstruction = '';
    if (includeGraphPaper) {
      const nextNum = (includeGeometry ? 9 : 8) + (includeFormulas ? 1 : 0);
      if (useAIImages) {
        graphPaperInstruction = `
${nextNum}. Include questions that require graph paper solutions:
   - Problems involving plotting points, lines, and curves on a coordinate plane
   - Graphing linear equations, quadratics, or other functions
   - Questions that ask students to "graph and show your work"
   - Include an "imagePrompt" field describing a coordinate plane with grid, axes labels, and any plotted elements`;
      } else {
        graphPaperInstruction = `
${nextNum}. Include questions that require graph paper solutions:
   - Problems involving plotting points, lines, and curves on a coordinate plane
   - Graphing linear equations, quadratics, or other functions
   - Questions that ask students to "graph and show your work"
   - Include SVG with a grid pattern (graph paper style) when appropriate
   - For graph paper SVGs, use: light gray grid lines, bold axis lines with labels, and marked intervals`;
      }
    }

    let coordinateGeometryInstruction = '';
    if (includeCoordinateGeometry) {
      const nextNum = (includeGeometry ? 9 : 8) + (includeFormulas ? 1 : 0) + (includeGraphPaper ? 1 : 0);
      if (useAIImages) {
        coordinateGeometryInstruction = `
${nextNum}. Include coordinate geometry problems:
   - Finding distance between points, midpoints, and slopes
   - Equations of lines (point-slope, slope-intercept forms)
   - Parallel and perpendicular lines in coordinate plane
   - Proving geometric properties using coordinates (e.g., proving a quadrilateral is a parallelogram)
   - Transformations on the coordinate plane
   - Include an "imagePrompt" field describing coordinate planes with plotted points and shapes`;
      } else {
        coordinateGeometryInstruction = `
${nextNum}. Include coordinate geometry problems:
   - Finding distance between points, midpoints, and slopes
   - Equations of lines (point-slope, slope-intercept forms)
   - Parallel and perpendicular lines in coordinate plane
   - Proving geometric properties using coordinates (e.g., proving a quadrilateral is a parallelogram)
   - Transformations on the coordinate plane
   - Include SVG diagrams showing coordinate planes with plotted points and shapes when helpful`;
      }
    }

    const imageFieldNote = includeGeometry 
      ? useAIImages
        ? `
If the question involves geometry and a diagram would help, include an "imagePrompt" field with a detailed description of the diagram. The imagePrompt field should ONLY be included when a visual diagram is genuinely helpful for the question.`
        : `
If the question involves geometry and a diagram would help, include an "svg" field with a complete SVG string. The svg field should ONLY be included when a visual diagram is genuinely helpful for the question.`
      : '';

    // Diagnostic mode instructions for advancement levels
    const diagnosticInstruction = worksheetMode === 'diagnostic' 
      ? `
DIAGNOSTIC ASSESSMENT MODE:
- Each question MUST include an "advancementLevel" field with a value from A to F
- Level A = Advanced (most challenging, requires synthesis and complex reasoning)
- Level B = Proficient (challenging, requires analysis and application)
- Level C = Developing (moderate difficulty, requires application)
- Level D = Beginning (foundational application with some guidance)
- Level E = Emerging (basic understanding with scaffolding)
- Level F = Foundational (entry-level, basic recall and recognition)
- Distribute questions across ALL levels (A through F) to diagnose student abilities
- Questions should progressively increase in complexity from F to A
- This diagnostic data will be used to create differentiated follow-up worksheets`
      : '';

    const exampleOutput = worksheetMode === 'diagnostic'
      ? `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}",
    "advancementLevel": "C"${useAIImages ? ',\n    "imagePrompt": "A detailed description of the geometric diagram needed"' : ''}
  }
]`
      : useAIImages
        ? `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}",
    "imagePrompt": "A detailed description of the geometric diagram needed"
  }
]`
        : `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}"${includeGeometry ? ',\n    "svg": "<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"' : ''}
  }
]`;

const prompt = `You are an expert math educator creating a professional, textbook-quality worksheet structured around BLOOM'S TAXONOMY for NYS Regents preparation.

Based on the following standards and topics, generate exactly ${questionCount} questions that progressively move through Bloom's Taxonomy cognitive levels.

TOPICS:
${topicsList}

═══════════════════════════════════════════════════════════════════════════════
BLOOM'S TAXONOMY STRUCTURE (MANDATORY - Follow this progression):
═══════════════════════════════════════════════════════════════════════════════

Each question MUST include a "bloomLevel" field (one of: remember, understand, apply, analyze, evaluate, create) and a "bloomVerb" field with the specific action verb used.

LEVEL 1: REMEMBER (Recall facts and basic concepts)
├── Verbs: define, identify, list, name, recall, recognize, state, label
├── Question types: What is the formula for...? Identify the...? What are the...?
└── Example: "State the Pythagorean theorem." / "Identify which expression represents a quadratic function."

LEVEL 2: UNDERSTAND (Explain ideas or concepts)
├── Verbs: describe, explain, interpret, classify, summarize, compare, paraphrase
├── Question types: Explain why...? What does this mean...? Compare...
└── Example: "Explain why the sum of angles in a triangle equals 180°." / "Describe the relationship between the slope and y-intercept."

LEVEL 3: APPLY (Use information in new situations)
├── Verbs: solve, calculate, demonstrate, apply, compute, construct, use, implement
├── Question types: Calculate...? Solve for...? Apply the formula to find...
└── Example: "Calculate the area of a circle with radius 7 cm." / "Solve: 3x² - 12 = 0"

LEVEL 4: ANALYZE (Draw connections among ideas)
├── Verbs: analyze, differentiate, examine, compare, contrast, investigate, distinguish
├── Question types: Why does...? What evidence...? How does X relate to Y...?
└── Example: "Analyze why the function f(x) = x² has no x-intercepts when shifted up by 5 units." / "Examine the relationship between the discriminant and the nature of roots."

LEVEL 5: EVALUATE (Justify a decision or course of action)
├── Verbs: evaluate, justify, critique, assess, argue, defend, judge, support
├── Question types: Is this the best approach...? Justify your reasoning...? Which method is more efficient...?
└── Example: "Evaluate whether the substitution or elimination method is more efficient for this system." / "Justify why the triangle is a right triangle."

LEVEL 6: CREATE (Produce new or original work)
├── Verbs: design, construct, develop, formulate, create, devise, compose, plan
├── Question types: Design a...? Create an equation that...? Develop a strategy to...?
└── Example: "Create a quadratic equation that has roots at x = 3 and x = -5." / "Design a geometric proof to show that the diagonals of a rhombus are perpendicular."

═══════════════════════════════════════════════════════════════════════════════
BLOOM'S LEVEL FILTER (IMPORTANT):
═══════════════════════════════════════════════════════════════════════════════
${bloomInstruction}

DISTRIBUTION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
- For ${questionCount} questions, distribute ONLY across the allowed cognitive levels: ${allowedBloomLevels.join(', ')}
- If all 6 levels are allowed, use this distribution:
  • 10-15% Remember/Understand (foundation questions to build confidence)
  • 30-40% Apply (core computational and procedural skills)
  • 30-40% Analyze/Evaluate (higher-order thinking and reasoning)
  • 10-20% Create (synthesis and original thinking)
- If only specific levels are selected, distribute questions evenly across those levels
- Start with lower-level questions and progress to higher levels
- Each question should explicitly test the cognitive level indicated

REQUIREMENTS:
1. Generate exactly ${questionCount} questions total
2. Distribute questions across the topics (approximately ${questionsPerTopic} per topic)
3. EVERY question must include "bloomLevel" and "bloomVerb" fields
4. ONLY use cognitive levels from the allowed list: ${allowedBloomLevels.join(', ')}
5. Include multi-step problems that require showing work at Apply level and above
6. ${difficultyInstruction}
7. Use real-world contexts where appropriate (especially for Apply and above)
8. Questions should be clear and unambiguous${geometryInstruction}${formulasInstruction}${graphPaperInstruction}${coordinateGeometryInstruction}
${diagnosticInstruction}

CRITICAL - TEXTBOOK-QUALITY FORMATTING:
- Write in fluid, complete sentences like a professional textbook
- Use proper mathematical Unicode symbols throughout:
  • π instead of "pi" or "3.14"
  • √ for roots (√2, √3, √5)
  • ² ³ ⁴ ⁵ for exponents (x², y³, n⁴)
  • ° for degrees (30°, 45°, 90°, 180°)
  • ∠ for angles (∠ABC, ∠XYZ)
  • ≤ ≥ ≠ for inequalities
  • θ for angle theta
  • △ for triangles (△ABC ≅ △DEF)
  • ⊥ for perpendicular, ∥ for parallel
  • ≅ for congruent, ~ for similar
  • ½ ⅓ ¼ ⅔ ¾ for common fractions
- Format examples:
  ✓ "In △ABC, if ∠A = 45° and ∠B = 60°, find the measure of ∠C."
  ✓ "Find the area of a circle with radius r = 5 cm. Express your answer in terms of π."
  ✓ "Simplify: √48 + 3√12"
  ✓ "Solve for x: 2x² - 5x + 3 = 0"

Respond with a JSON array of questions in this exact format:
[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}",
    "bloomLevel": "apply",
    "bloomVerb": "calculate"${worksheetMode === 'diagnostic' ? ',\n    "advancementLevel": "C"' : ''}${useAIImages ? ',\n    "imagePrompt": "A detailed description of the diagram needed"' : ''}
  }
]
${imageFieldNote}

Difficulty levels allowed: ${allowedDifficulties.join(', ')}
Bloom levels required: remember, understand, apply, analyze, evaluate, create (distribute appropriately)
${worksheetMode === 'diagnostic' ? 'Advancement levels required: A, B, C, D, E, F (distribute across all levels)' : ''}

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const content = await callLovableAI(prompt);

    // Parse the JSON response
    let questions: GeneratedQuestion[];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      questions = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse generated questions');
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-worksheet-questions:', error);
    
    // Handle structured errors with status codes
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      return new Response(
        JSON.stringify({ error: (error as { message: string }).message }),
        { status: (error as { status: number }).status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const message = error instanceof Error ? error.message : 'Failed to generate questions';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
