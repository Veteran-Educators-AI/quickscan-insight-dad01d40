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
type WorksheetMode = 'practice' | 'basic_assessment' | 'diagnostic' | 'warmup';

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  answer?: string; // The correct answer/solution for the teacher's answer key
  difficulty: 'medium' | 'hard' | 'challenging';
  bloomLevel: BloomLevel;
  bloomVerb: string; // The action verb used (e.g., "identify", "compare", "design")
  advancementLevel?: AdvancementLevel;
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
  hint?: string;
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

  // Get the response text first to handle empty responses
  const responseText = await response.text();
  
  if (!responseText || responseText.trim() === '') {
    console.error('Empty response from Lovable AI');
    throw new Error('AI returned empty response. Please try again.');
  }
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse AI response:', responseText.substring(0, 500));
    throw new Error('Invalid response format from AI. Please try again.');
  }
  
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('No content in AI response data:', JSON.stringify(data).substring(0, 500));
    throw new Error('No content in AI response');
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topics, questionCount, difficultyLevels, bloomLevels, includeGeometry, includeFormulas, includeGraphPaper, includeCoordinateGeometry, useAIImages, worksheetMode, variationSeed, studentName, formVariation, formSeed, includeHints, includeAnswerKey } = await req.json() as {
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
      variationSeed?: number;
      studentName?: string;
      formVariation?: string;
      formSeed?: number;
      includeHints?: boolean;
      includeAnswerKey?: boolean;
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
    
    // Handle warm-up mode with very easy questions
    const isWarmup = worksheetMode === 'warmup';
    const warmupDifficulty = difficultyLevels?.[0] || 'very-easy';
    const allowedDifficulties = isWarmup 
      ? [warmupDifficulty]
      : (difficultyLevels && difficultyLevels.length > 0 
        ? difficultyLevels 
        : ['medium', 'hard', 'challenging']);
    
    let difficultyInstruction: string;
    if (isWarmup) {
      if (warmupDifficulty === 'super-easy') {
        difficultyInstruction = 'Generate ONLY super easy questions. These should be basic math facts that students can answer in seconds. Examples: "What is 2 + 2?", "What is 3 × 4?", "What is half of 10?". Single-step basic arithmetic ONLY. No word problems, no multi-step calculations.';
      } else if (warmupDifficulty === 'very-easy') {
        difficultyInstruction = 'Generate ONLY very easy, confidence-building questions. These should be extremely simple recall or basic one-step arithmetic that ANY student can solve immediately. Examples: "What is 3 + 5?", "What is the area of a square with side 2?". NO multi-step problems. Keep it VERY simple.';
      } else {
        difficultyInstruction = 'Generate easy confidence-building questions. These should be simple one-step application problems. Examples: "If a rectangle has length 4 and width 3, what is its area?", "Solve: 2x = 10". Keep problems straightforward with minimal steps.';
      }
    } else {
      // Map super-easy and easy to specific instructions for main questions
      const hasEasyLevels = allowedDifficulties.some(d => d === 'easy' || d === 'super-easy');
      if (hasEasyLevels) {
        difficultyInstruction = `Generate questions with these difficulty levels: ${allowedDifficulties.join(', ')}.
- "super-easy": Basic math facts, single arithmetic operations (e.g., "What is 7 × 8?", "Simplify: 15 ÷ 3")
- "easy": Simple one-step problems with straightforward application (e.g., "Find the area of a rectangle with length 5 and width 3")
- "medium": Standard problems requiring 2-3 steps
- "hard": Complex problems requiring analysis and multiple steps
- "challenging": Advanced problems requiring synthesis and creative problem-solving`;
      } else {
        difficultyInstruction = `Only generate questions with these difficulty levels: ${allowedDifficulties.join(', ')}.`;
      }
    }

    // Form-based variation for anti-copying (different from per-student variation)
    const formInstruction = formVariation && formSeed
      ? `
FORM VARIATION (CRITICAL - ANTI-COPYING MEASURE FOR DIAGNOSTICS):
- This is Form ${formVariation} of the diagnostic assessment
- Use form seed: ${formSeed} to ensure this form has COMPLETELY DIFFERENT questions from other forms
- Forms A, B, C, D, E should each have UNIQUE question sets testing the SAME concepts
- Vary: specific numbers, contexts, problem scenarios, names in word problems
- Keep: same difficulty level, same concepts being tested, same skills assessed
- Example: Form A might ask "Find the area of a rectangle 5×3", Form B asks "Find the area of a rectangle 7×4"
- This prevents students sitting together from copying each other's answers
- Each form tests the same material but with different specific problems`
      : '';

    // Legacy variation instruction for unique questions per student (kept for backward compatibility)
    const variationInstruction = variationSeed 
      ? `
VARIATION REQUIREMENT (CRITICAL - ANTI-COPYING MEASURE):
- Use variation seed: ${variationSeed}
- Generate UNIQUE questions that differ from other students' worksheets
- Vary: numbers, contexts, names in word problems, specific values, order of operations
- Keep the same concepts and difficulty, but change the specific details
- Example: Instead of "Find the area of a rectangle with length 5 and width 3", use different numbers like "6 and 4" or different contexts like "Find the perimeter of a garden..."
- This ensures each student ${studentName ? `(${studentName})` : ''} gets a unique worksheet`
      : '';

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

    // Hint instruction for students
    const hintInstruction = includeHints
      ? `
STUDENT HINTS (REQUIRED):
- Every question MUST include a "hint" field with a helpful hint for students
- Hints should give students a starting point WITHOUT giving away the answer
- Good hints include:
  • "Remember the formula for..." 
  • "Start by identifying what you're trying to find..."
  • "Think about how these two values relate..."
  • "Try drawing a picture to help you visualize..."
  • "What operation do you use when you see the word 'total'?"
- Keep hints encouraging and student-friendly
- Hints should be 1-2 sentences max
- The goal is to help students get "unstuck" without doing the problem for them`
      : '';

    // Answer key instruction for teachers
    const answerKeyInstruction = includeAnswerKey
      ? `
TEACHER ANSWER KEY (REQUIRED):
- Every question MUST include an "answer" field with the complete correct answer
- For computational problems: Include the final numerical answer AND brief solution steps
- For conceptual questions: Provide the expected correct response
- For proofs: Include key steps or approach
- Format answers clearly and concisely
- Examples:
  • "answer": "x = 5 (Divide both sides by 3: 3x = 15 → x = 5)"
  • "answer": "Area = 25π cm² (A = πr² = π(5)² = 25π)"
  • "answer": "The angle is 60°. Since angles in a triangle sum to 180°, and two angles are 60° each, the third must be 60°."
- This is for the teacher's reference when grading student work`
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
      : worksheetMode === 'warmup'
      ? `
WARM-UP MODE (Confidence Building):
- Generate ONLY very simple, easy questions that build student confidence
- These should be "quick wins" - problems any student can solve
- Focus on basic recall, simple one-step calculations, or recognition
- Use encouraging, approachable language
- Examples: "What is 5 + 7?", "If a rectangle has length 4 and width 2, what is its area?"
- Keep questions SHORT and straightforward
- NO complex multi-step problems
- NO challenging vocabulary
- This warm-up helps students feel confident before tackling harder problems`
      : '';

    const hintExample = includeHints ? ',\n    "hint": "Remember to use the formula for area. What shape is this?"' : '';
    const answerExample = includeAnswerKey ? ',\n    "answer": "x = 5 (Divide both sides by 3)"' : '';

    const exampleOutput = worksheetMode === 'diagnostic'
      ? `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}",
    "advancementLevel": "C"${hintExample}${answerExample}${useAIImages ? ',\n    "imagePrompt": "A detailed description of the geometric diagram needed"' : ''}
  }
]`
      : useAIImages
        ? `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}"${hintExample}${answerExample},
    "imagePrompt": "A detailed description of the geometric diagram needed"
  }
]`
        : `[
  {
    "questionNumber": 1,
    "topic": "Topic Name",
    "standard": "G.CO.A.1",
    "question": "The full question text here",
    "difficulty": "${allowedDifficulties[0]}"${hintExample}${answerExample}${includeGeometry ? ',\n    "svg": "<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>"' : ''}
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
${hintInstruction}
${answerKeyInstruction}
${formInstruction}
${variationInstruction}

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
    "bloomVerb": "calculate"${worksheetMode === 'diagnostic' ? ',\n    "advancementLevel": "C"' : ''}${includeHints ? ',\n    "hint": "Remember to use the formula for..."' : ''}${includeAnswerKey ? ',\n    "answer": "x = 5 (Divide both sides by 3)"' : ''}${useAIImages ? ',\n    "imagePrompt": "A detailed description of the diagram needed"' : ''}
  }
]
${imageFieldNote}

Difficulty levels allowed: ${allowedDifficulties.join(', ')}
Bloom levels required: remember, understand, apply, analyze, evaluate, create (distribute appropriately)
${worksheetMode === 'diagnostic' ? 'Advancement levels required: A, B, C, D, E, F (distribute across all levels)' : ''}

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const content = await callLovableAI(prompt);

    // Function to fix common Unicode encoding issues in math text
    function sanitizeMathText(text: string): string {
      if (!text) return text;
      
      let result = text;
      
      // First pass: Remove any emoji characters that might cause PDF rendering issues
      // Emojis don't render well in jsPDF and cause garbled output like "Ø=Ü¡"
      result = result
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')  // Miscellaneous Symbols, Emoticons
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Miscellaneous Symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation Selectors
        .replace(/[\u{1F000}-\u{1F02F}]/gu, '')  // Mahjong Tiles
        .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')  // Playing Cards
        .replace(/💡/g, '')                       // Lightbulb (common in hints)
        .replace(/✨/g, '')                       // Sparkles
        .replace(/📝/g, '')                       // Memo
        .replace(/🎉/g, '');                      // Party popper
      
      // Second pass: Fix ampersand-interleaved text corruption
      // This catastrophic encoding pattern inserts & between each character
      // Example: "&p&a&i&n&t&e&d&" -> "painted"
      // We need to detect and fix this pattern before other fixes
      const ampersandPattern = /(&[a-zA-Z]){3,}/g;
      if (ampersandPattern.test(result)) {
        // Remove all & characters that are between single letters
        result = result.replace(/&([a-zA-Z])(?=&|$|\s|\.)/g, '$1');
        result = result.replace(/^&([a-zA-Z])/g, '$1');
      }
      
      // Fix standalone & before letters (partial corruption)
      result = result.replace(/&([a-zA-Z])&/g, '$1');
      
      // Second pass: Fix mojibake patterns (UTF-8 decoded as Latin-1/Windows-1252)
      const mojibakePatterns: [RegExp, string][] = [
        // Greek letters mojibake
        [/Ï€/g, 'π'],      // π (pi)
        [/Î¸/g, 'θ'],      // θ (theta)
        [/Î±/g, 'α'],      // α (alpha)
        [/Î²/g, 'β'],      // β (beta)
        [/Î³/g, 'γ'],      // γ (gamma)
        [/Î"/g, 'Δ'],      // Δ (Delta)
        [/Î´/g, 'δ'],      // δ (delta)
        [/Ïˆ/g, 'ψ'],      // ψ (psi)
        [/Ï†/g, 'φ'],      // φ (phi)
        [/Î£/g, 'Σ'],      // Σ (Sigma)
        [/Ïƒ/g, 'σ'],      // σ (sigma)
        [/Î©/g, 'Ω'],      // Ω (Omega)
        [/Ï‰/g, 'ω'],      // ω (omega)
        [/Î»/g, 'λ'],      // λ (lambda)
        [/Î¼/g, 'μ'],      // μ (mu)
        [/Ï/g, 'ρ'],       // ρ (rho) - careful, this is generic
        
        // Math operators mojibake
        [/â‰¤/g, '≤'],      // ≤
        [/â‰¥/g, '≥'],      // ≥
        [/â‰ /g, '≠'],      // ≠
        [/â†'/g, '→'],      // →
        [/â†/g, '←'],       // ←
        [/âˆš/g, '√'],      // √
        [/âˆž/g, '∞'],      // ∞
        [/Ã—/g, '×'],      // ×
        [/Ã·/g, '÷'],      // ÷
        [/â€"/g, '—'],      // em dash
        [/â€™/g, "'"],     // right single quote
        [/â€œ/g, '"'],     // left double quote
        [/â€/g, '"'],      // right double quote (partial)
        [/â€˜/g, "'"],     // left single quote
        [/â€¦/g, '...'],   // ellipsis
        [/â€"/g, '-'],      // en dash
        [/âˆ /g, '∠'],      // angle symbol
        [/âŠ¥/g, '⊥'],      // perpendicular
        [/â‰…/g, '≅'],      // congruent
        [/âˆ†/g, '△'],      // triangle
        
        // Fix common Â prefix corruption (UTF-8 BOM or encoding mismatch)
        [/Â\s*π/g, 'π'],
        [/Âπ/g, 'π'],
        [/πÂ/g, 'π'],
        [/Â°/g, '°'],
        [/°Â/g, '°'],
        [/Â²/g, '²'],
        [/Â³/g, '³'],
        [/Â½/g, '½'],
        [/Â¼/g, '¼'],
        [/Â¾/g, '¾'],
        [/Â±/g, '±'],
        [/Â·/g, '·'],
        [/Âµ/g, 'μ'],      // mu from Latin-1
        
        // Fix À (Latin capital A with grave) which often corrupts π
        [/À(?=\s|$|\.|\,)/g, 'π'],  // À at word boundary -> π
        [/(\d)\s*À/g, '$1π'],        // number followed by À -> π
        
        // Fix numbers followed by Â (common in "terms of π" expressions)
        [/(\d)Â(?=\s|$|\.)/g, '$1π'],
        [/(\d)Â\s*cm/gi, '$1π cm'],
        [/(\d)Â\s*cubic/gi, '$1π cubic'],
        [/(\d)Â\s*square/gi, '$1π square'],
        [/(\d)Â\s*meter/gi, '$1π meter'],
        [/(\d)Â\s*inch/gi, '$1π inch'],
        [/(\d)Â\s*unit/gi, '$1π unit'],
      ];
      
      for (const [pattern, replacement] of mojibakePatterns) {
        result = result.replace(pattern, replacement);
      }
      
      // Third pass: Clean up remaining artifacts
      result = result
        // Clean up stray Â characters
        .replace(/Â(?![a-zA-Z0-9°²³])/g, '')
        .replace(/Â\s+/g, ' ')
        .replace(/\s+Â/g, ' ')
        // Clean up double spaces
        .replace(/\s{2,}/g, ' ')
        // Trim
        .trim();
      
      return result;
    }

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
      
      // Sanitize all question text to fix encoding issues
      questions = questions.map(q => ({
        ...q,
        question: sanitizeMathText(q.question),
        answer: q.answer ? sanitizeMathText(q.answer) : q.answer,
        hint: q.hint ? sanitizeMathText(q.hint) : q.hint,
        imagePrompt: q.imagePrompt ? sanitizeMathText(q.imagePrompt) : q.imagePrompt,
      }));
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
