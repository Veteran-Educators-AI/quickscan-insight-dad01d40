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

async function callLovableAI(prompt: string, useAdvancedModel: boolean = false): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Use GPT-5.2 for Geometry and Physics with shapes/diagrams for better accuracy
  const model = useAdvancedModel ? 'openai/gpt-5.2' : 'google/gemini-2.5-flash';
  console.log(`Using AI model: ${model} (advanced: ${useAdvancedModel})`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `You are an expert math educator creating textbook-quality problems. 

CRITICAL FORMATTING REQUIREMENTS - MUST FOLLOW EXACTLY:

NEVER use LaTeX notation. Do NOT use:
- Dollar signs for math: $x$ or $$equation$$
- Backslash commands: \\frac, \\neq, \\geq, \\leq, \\sqrt, \\cdot, \\times, etc.
- Any LaTeX syntax whatsoever

INSTEAD, use proper mathematical Unicode symbols DIRECTLY in ALL questions:
  • Use π (not "pi", not "\\pi", not "$\\pi$")
  • Use √ for square roots (e.g., √2, √3, √(x+1))
  • Use ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ for exponents (e.g., x², y³, r⁴)
  • Use ° for degrees (e.g., 45°, 90°)
  • Use ∠ for angles (e.g., ∠ABC)
  • Use ≤ ≥ ≠ for inequalities (NOT \\leq \\geq \\neq)
  • Use × for multiplication in expressions
  • Use ÷ for division where appropriate
  • Use θ for angle theta
  • Use ½ ⅓ ¼ ⅔ ¾ for common fractions
  • For complex fractions, write as: (numerator)/(denominator) e.g., (x² + 1)/(x - 2)
  • Use ⊥ for perpendicular
  • Use ∥ for parallel
  • Use △ for triangle notation (e.g., △ABC)
  • Use ≅ for congruent
  • Use ~ for similar

CURRENCY FORMATTING (CRITICAL):
  • ALL money values MUST include the dollar sign: $4.00, $12.50, $100.00
  • Always use two decimal places for cents: $5.00 (not $5)
  • For word problems involving money, profit, cost, price, revenue, savings, etc. - ALWAYS format as currency
  • Examples: "The item costs $4.00" NOT "The item costs 4.00"
  • Examples: "He earned a profit of $25.50" NOT "He earned a profit of 25.50"
  • This helps students understand real-world financial context

SVG CRITICAL RULES (if generating SVG):
  • Keep SVG paths EXTREMELY simple - use basic shapes only
  • Maximum 500 characters per SVG string
  • Prefer simple geometric primitives (rect, circle, line, polygon) over complex paths
  • If a diagram is complex, use imagePrompt instead of svg
  
Write questions in a fluid, professional textbook style - complete sentences, clear mathematical language, and elegant formatting.

Return only valid JSON arrays when asked for questions.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 12000,
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

    const { 
      topics, 
      questionCount, 
      difficultyLevels, 
      bloomLevels, 
      includeGeometry, 
      includeFormulas, 
      includeGraphPaper, 
      includeCoordinateGeometry, 
      useAIImages, 
      worksheetMode, 
      variationSeed, 
      studentName, 
      formVariation, 
      formSeed, 
      includeHints, 
      includeAnswerKey,
      studentContext,
      targetMisconceptions,
      englishContext,
    } = await req.json() as {
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
      studentContext?: {
        studentLevel?: string;
        trend?: 'improving' | 'stable' | 'declining';
        weakTopics?: string[];
        misconceptions?: string[];
        averageScore?: number;
      };
      targetMisconceptions?: string[];
      englishContext?: {
        textTitle: string;
        author: string;
        genre: string;
        themes: string[];
        literaryDevices: string[];
        gradeLevel: string;
        questionFormat: 'multiple_choice' | 'short_answer' | 'extended_response' | 'text_evidence' | 'mixed';
        focusAreas: string[];
        includeTextReferences: boolean;
        includeRubric: boolean;
        lessonObjectives?: string[];
      };
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
    // IMPORTANT: Only generate diagrams if BOTH includeGeometry AND useAIImages are true
    // If useAIImages is false, do NOT generate SVG diagrams either - this is the "no image generation" mode
    let geometryInstruction = '';
    if (includeGeometry && useAIImages) {
      geometryInstruction = `
8. For geometry-related questions, you MUST include an "imagePrompt" field. Write the prompt using this STRICT format:

═══════════════════════════════════════════════════════════════════════════════
IMAGEPR0MPT FORMAT - USE THIS EXACT STRUCTURE
═══════════════════════════════════════════════════════════════════════════════

Your imagePrompt must be a SIMPLE, CLEAR description that includes:

1. WHAT TO DRAW: State the shape/diagram type simply
2. COORDINATES/VERTICES: List each point with its EXACT coordinates
3. CONNECTIONS: State which points connect to form the shape
4. LABELS: Specify how to label each vertex (Letter + coordinates)
5. MEASUREMENTS: Only include if specifically needed

═══════════════════════════════════════════════════════════════════════════════
STRICT RULES FOR imagePrompt
═══════════════════════════════════════════════════════════════════════════════

- Keep it SIMPLE and SPECIFIC
- List vertices in order: A, B, C, D (clockwise from bottom-left usually)
- Each vertex gets ONE label only - never repeat labels
- Place labels OUTSIDE the shape
- Black lines on white background only
- No colors, no shading, no gradients
- No extra decorations or arrows unless needed

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE: Rectangle on Coordinate Plane
═══════════════════════════════════════════════════════════════════════════════

"Draw a coordinate plane with x-axis from 0 to 8 and y-axis from 0 to 5.

Plot these 4 points as black dots:
- A at (1, 1) - label it 'A(1,1)' to the lower-left
- B at (7, 1) - label it 'B(7,1)' to the lower-right  
- C at (7, 4) - label it 'C(7,4)' to the upper-right
- D at (1, 4) - label it 'D(1,4)' to the upper-left

Connect A→B→C→D→A with straight black lines to form a rectangle.

Label the bottom side '6 units' and the right side '3 units'.

Black and white only. Simple and clean."

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE: Right Triangle
═══════════════════════════════════════════════════════════════════════════════

"Draw a right triangle with:
- Vertex A at the top
- Vertex B at the bottom-left (right angle here)
- Vertex C at the bottom-right

The base BC is horizontal. The side AB is vertical. The hypotenuse AC is diagonal.

Mark the right angle at B with a small square symbol.

Label the sides:
- AB (vertical) = '6 cm'
- BC (horizontal) = '8 cm'  
- AC (diagonal) = '10 cm'

Place vertex labels A, B, C outside the triangle near each corner.

Black and white only. Simple and clean."

═══════════════════════════════════════════════════════════════════════════════
DO NOT DO THESE THINGS IN YOUR imagePrompt
═══════════════════════════════════════════════════════════════════════════════
- DO NOT repeat vertex labels (each letter appears once)
- DO NOT add colors or shading
- DO NOT add unnecessary arrows or decorations
- DO NOT make it overly complex
- DO NOT forget to specify label positions`;
    } else if (includeGeometry && !useAIImages) {
      // When includeGeometry is on but useAIImages is off, just describe shapes in text - NO SVG generation
      geometryInstruction = `
8. For geometry-related questions, describe the shapes clearly in the question text itself.
   - Use clear verbal descriptions of shapes (e.g., "A rectangle with length 5 cm and width 3 cm")
   - Include all necessary measurements in the question text
   - DO NOT include any "svg" or "imagePrompt" fields - this worksheet is text-only
   - Students should be able to draw the shapes themselves based on your description`;
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
   
   For these questions, include an "imagePrompt" field with EXPLICIT details like:
   "A Cartesian coordinate plane with a complete grid pattern:
    - X-axis labeled from -10 to 10 with tick marks at each integer.
    - Y-axis labeled from -10 to 10 with tick marks at each integer.
    - Grid lines are thin and gray, axes are bold black with arrows.
    - The linear equation y = 2x + 1 is graphed as a straight line.
    - Two points on the line are marked: (0, 1) labeled 'y-intercept' and (2, 5) labeled with coordinates.
    - The slope is illustrated with a right triangle showing 'rise = 4' and 'run = 2'."`;
      } else {
        graphPaperInstruction = `
${nextNum}. Include questions that require graph paper solutions:
   - Problems involving plotting points, lines, and curves on a coordinate plane
   - Graphing linear equations, quadratics, or other functions
   - Questions that ask students to "graph and show your work"
   - Describe the graph clearly in text so students can draw it themselves
   - DO NOT include any "svg" or "imagePrompt" fields - this worksheet is text-only`;
      }
    }

    let coordinateGeometryInstruction = '';
    if (includeCoordinateGeometry) {
      const nextNum = (includeGeometry ? 9 : 8) + (includeFormulas ? 1 : 0) + (includeGraphPaper ? 1 : 0);
      if (useAIImages) {
        coordinateGeometryInstruction = `
${nextNum}. Include coordinate geometry problems with HIGHLY DETAILED imagePrompt fields:
   - Finding distance between points, midpoints, and slopes
   - Equations of lines (point-slope, slope-intercept forms)
   - Parallel and perpendicular lines in coordinate plane
   
   EXAMPLE imagePrompt for a distance/midpoint problem:
   "A Cartesian coordinate plane with a clear numbered grid from -5 to 10 on both axes.
    - Point P is plotted at exactly (2, 5) with a solid black dot, labeled 'P (2, 5)'.
    - Point Q is plotted at exactly (8, 3) with a solid black dot, labeled 'Q (8, 3)'.
    - A straight line segment PQ connects the two points.
    - The midpoint M at (5, 4) is marked with a smaller dot, labeled 'M (5, 4)'.
    - A dashed horizontal line from P shows the horizontal distance '6 units'.
    - A dashed vertical line from Q shows the vertical distance '2 units'.
    - The distance formula d = √[(x₂-x₁)² + (y₂-y₁)²] is written below."`;
      } else {
        coordinateGeometryInstruction = `
${nextNum}. Include coordinate geometry problems:
   - Finding distance between points, midpoints, and slopes
   - Equations of lines (point-slope, slope-intercept forms)
   - Parallel and perpendicular lines in coordinate plane
   - Proving geometric properties using coordinates
   - Describe all coordinates and shapes clearly in the question text
   - DO NOT include any "svg" or "imagePrompt" fields - this worksheet is text-only`;
      }
    }

    // Only include imageFieldNote if AI images are enabled
    const imageFieldNote = useAIImages && includeGeometry 
      ? `
If the question involves geometry and a diagram would help, include an "imagePrompt" field with a detailed description of the diagram. The imagePrompt field should ONLY be included when a visual diagram is genuinely helpful for the question.`
      : `
DO NOT include "svg" or "imagePrompt" fields. This is a TEXT-ONLY worksheet. Describe all shapes and diagrams verbally in the question text.`;

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
- This diagnostic data will be used to create differentiated follow-up worksheets${studentContext ? `

ADAPTIVE PERSONALIZATION (CRITICAL):
This worksheet is being generated for a specific student with the following performance profile:
- Current Level: ${studentContext.studentLevel || 'C'}
- Performance Trend: ${studentContext.trend || 'stable'}
- Average Score: ${studentContext.averageScore || 70}%
${studentContext.weakTopics?.length ? `- Weak Topics: ${studentContext.weakTopics.join(', ')}` : ''}
${studentContext.misconceptions?.length ? `- Known Misconceptions: ${studentContext.misconceptions.join('; ')}` : ''}

PERSONALIZATION REQUIREMENTS:
1. Focus questions on the student's weak areas to build mastery
2. Start with questions slightly below their current level to build confidence
3. Include questions that directly address their specific misconceptions
4. For students with declining trends, include more scaffolded questions with hints
5. For students with improving trends, include stretch questions to challenge growth
6. Make questions feel personalized - vary contexts, numbers, and scenarios uniquely` : ''}${targetMisconceptions?.length ? `

TARGET MISCONCEPTIONS (MUST ADDRESS):
The following specific misconceptions have been identified in this student's work. Create questions that DIRECTLY address and remediate these misunderstandings:
${targetMisconceptions.map((m, i) => `${i + 1}. "${m}"`).join('\n')}

For each misconception, include at least one question designed to:
- Test whether the student still holds this misconception
- Guide them toward the correct understanding
- Provide opportunities to demonstrate corrected thinking` : ''}`
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

// Check if this is an English Literature worksheet
const isEnglishLiterature = englishContext && topics[0]?.subject === 'English';

let prompt: string;

if (isEnglishLiterature) {
  // ═══════════════════════════════════════════════════════════════════════════════
  // ENGLISH LITERATURE WORKSHEET PROMPT
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const formatInstructions: Record<string, string> = {
    'multiple_choice': `Generate ONLY multiple choice questions with exactly 4 options (A, B, C, D).
Include the "options" field as an array of 4 strings.
Include the "answer" field with the correct letter (A, B, C, or D).`,
    'short_answer': `Generate short answer questions requiring 1-3 sentence responses.
Include the "answer" field with a model response.`,
    'extended_response': `Generate extended response questions requiring paragraph-length analysis (4-6 sentences).
Include the "answer" field with key points the response should address.
Include "rubricPoints" field with the point value (typically 4-6 points).`,
    'text_evidence': `Generate text evidence questions that require students to cite AND explain evidence from the text.
Each question should ask students to find a quote and explain its significance.
Include the "answer" field with an example text reference and explanation.
Include "textReference" field with a suggested passage reference (e.g., "Chapter 3, page 45").`,
    'mixed': `Generate a MIX of question formats:
- 30% Multiple Choice (include "options" array with 4 choices)
- 30% Short Answer
- 25% Extended Response (include "rubricPoints")
- 15% Text Evidence (include "textReference")
Include the appropriate fields for each question type.`
  };

  const focusAreaDescriptions: Record<string, string> = {
    'character': 'character development, motivations, relationships, and character arcs',
    'theme': 'central themes, recurring motifs, and thematic development',
    'literary_devices': 'literary devices, figurative language, and stylistic choices',
    'plot': 'plot structure, key events, conflict development, and resolution',
    'setting': 'setting details, historical context, and how setting influences the narrative',
    'author_purpose': "author's purpose, intended audience, and rhetorical strategies",
    'symbolism': 'symbols, their meanings, and how they reinforce themes',
    'conflict': 'types of conflict (internal/external), conflict development, and resolution',
  };

  const selectedFocusDescriptions = englishContext.focusAreas
    .map(area => focusAreaDescriptions[area] || area)
    .join('; ');

  const textReferenceInstruction = englishContext.includeTextReferences
    ? `IMPORTANT: Include specific text references in your questions when applicable.
Examples: "In Chapter 3, when Scout says...", "Referring to the scene where...", "Based on the passage describing..."`
    : '';

  const rubricInstruction = englishContext.includeRubric
    ? `Include a "rubricPoints" field (2-6 points) for extended response and text evidence questions.`
    : '';

  const lessonObjectivesInstruction = englishContext.lessonObjectives?.length
    ? `\nALIGN QUESTIONS TO THESE LESSON OBJECTIVES:\n${englishContext.lessonObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    : '';

  prompt = `You are an expert English Language Arts educator creating a professional, NYS-aligned literature assessment.

LITERARY TEXT CONTEXT:
═══════════════════════════════════════════════════════════════════════════════
Title: "${englishContext.textTitle}" by ${englishContext.author}
Genre: ${englishContext.genre}
Grade Level: ${englishContext.gradeLevel}
Key Themes: ${englishContext.themes.join(', ')}
Literary Devices: ${englishContext.literaryDevices.join(', ')}
═══════════════════════════════════════════════════════════════════════════════

TOPIC/LESSON FOCUS:
${topicsList}
${lessonObjectivesInstruction}

QUESTION FORMAT REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
${formatInstructions[englishContext.questionFormat] || formatInstructions['mixed']}

FOCUS AREAS (emphasize these in your questions):
${selectedFocusDescriptions}

${textReferenceInstruction}
${rubricInstruction}

COGNITIVE LEVELS (Bloom's Taxonomy for Literature):
═══════════════════════════════════════════════════════════════════════════════
${bloomInstruction}

COMPREHENSION LEVEL (Remember/Understand):
├── Identify characters, settings, plot events
├── Summarize sections or chapters
├── Define vocabulary in context
└── Example: "Who is the narrator of the story?" / "What event triggers the main conflict?"

ANALYSIS LEVEL (Apply/Analyze):
├── Analyze character motivations and development
├── Examine literary devices and their effects
├── Compare and contrast elements within the text
└── Example: "How does the author use symbolism to develop the theme of innocence?" / "Analyze the significance of the setting in Chapter 4."

HIGHER-ORDER LEVEL (Evaluate/Create):
├── Evaluate character decisions and author choices
├── Synthesize themes across the text
├── Construct arguments using textual evidence
└── Example: "Evaluate whether the protagonist's final decision was justified. Use evidence from the text." / "How does this text reflect the social issues of its time?"

REQUIREMENTS:
1. Generate exactly ${questionCount} questions
2. Include "bloomLevel" (remember, understand, apply, analyze, evaluate, or create) for each question
3. Include "bloomVerb" with the action verb used
4. Include "cognitiveLevel" (comprehension, analysis, or higher-order) 
5. Questions should be engaging and require genuine engagement with the text
6. Use specific character names, events, and details from the text
7. For extended response, provide clear criteria for a strong answer
8. Questions should be appropriate for grade level ${englishContext.gradeLevel}

STANDARD ALIGNMENT:
Use NYS/Common Core ELA standards. Common standards for literature:
- RL.9-10.1 / RL.11-12.1: Cite textual evidence
- RL.9-10.2 / RL.11-12.2: Determine themes
- RL.9-10.3 / RL.11-12.3: Analyze character development
- RL.9-10.4 / RL.11-12.4: Determine word meanings, analyze word choice
- RL.9-10.5 / RL.11-12.5: Analyze text structure
- RL.9-10.6 / RL.11-12.6: Analyze point of view

Respond with a JSON array:
[
  {
    "questionNumber": 1,
    "topic": "${englishContext.textTitle}",
    "standard": "RL.9-10.3",
    "question": "The full question text here",
    "difficulty": "medium",
    "bloomLevel": "analyze",
    "bloomVerb": "analyze",
    "cognitiveLevel": "analysis",
    "questionFormat": "short_answer",
    "answer": "Model answer or key points"${englishContext.includeTextReferences ? ',\n    "textReference": "Chapter/page reference"' : ''}${englishContext.includeRubric ? ',\n    "rubricPoints": 4' : ''}
  }
]

For multiple choice questions, include: "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"]

IMPORTANT: Return ONLY the JSON array, no other text.`;

} else {
  // ═══════════════════════════════════════════════════════════════════════════════
  // ORIGINAL MATH/SCIENCE WORKSHEET PROMPT
  // ═══════════════════════════════════════════════════════════════════════════════

prompt = `You are an expert math educator creating a professional, textbook-quality worksheet structured around BLOOM'S TAXONOMY for NYS Regents preparation.

Based on the following standards and topics, generate exactly ${questionCount} questions that progressively move through Bloom's Taxonomy cognitive levels.

TOPICS:
${topicsList}

═══════════════════════════════════════════════════════════════════════════════
STUDENT WORKSPACE REQUIREMENTS (CRITICAL FOR AI SCANNING):
═══════════════════════════════════════════════════════════════════════════════

IMPORTANT: Design questions that allow GENEROUS WORKSPACE for students to show their work clearly.
- Questions should be structured so students have PLENTY OF ROOM to write out all steps
- Avoid questions that require tiny, cramped work areas
- Multi-step problems should be phrased to encourage showing work STEP BY STEP
- For geometry: describe shapes verbally rather than requiring diagram interpretation
- Each problem should have a clear "final answer" that students can box or circle
- Leave mental space for: initial setup, intermediate calculations, final answer

This enables the AI grading system to:
1. Clearly see each step of student work
2. Identify where errors occur in the problem-solving process
3. Provide targeted feedback on specific misconceptions
4. Award appropriate partial credit for shown work

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

}

    // Use GPT-5.2 for Geometry and Physics worksheets with shapes for better diagram accuracy
    const isGeometryOrPhysics = topics.some(t => 
      t.subject?.toLowerCase() === 'geometry' || 
      t.subject?.toLowerCase() === 'physics' ||
      t.category?.toLowerCase().includes('geometry') ||
      t.category?.toLowerCase().includes('trigonometry') ||
      t.category?.toLowerCase().includes('physics')
    );
    const useAdvancedModel = isGeometryOrPhysics && (includeGeometry || useAIImages || includeCoordinateGeometry);
    
    console.log(`Worksheet generation: subjects=${topics.map(t => t.subject).join(',')}, useAdvancedModel=${useAdvancedModel}`);
    
    const content = await callLovableAI(prompt, useAdvancedModel);

    // Function to fix common Unicode encoding issues in math text
    function sanitizeMathText(text: string): string {
      if (!text) return text;
      
      let result = text;
      
      // FIRST: Convert plain-text math notation to Unicode symbols
      // This handles cases where the AI outputs "pi", "tan^2", etc. instead of proper Unicode
      
      // Convert plain-text "pi" to π symbol (but not in words like "spinning", "pieces")
      result = result
        .replace(/\bpi\b(?!\s*[a-zA-Z])/gi, 'π')     // standalone "pi"
        .replace(/(\d)\s*pi\b/gi, '$1π')              // "2pi" -> "2π"
        .replace(/pi\/(\d)/gi, 'π/$1')                // "pi/3" -> "π/3"
        .replace(/(\d)pi\/(\d)/gi, '$1π/$2')          // "2pi/3" -> "2π/3"
        .replace(/npi\b/gi, 'nπ')                     // "npi" -> "nπ"
        .replace(/\+\s*nπ/g, ' + nπ')                 // clean up spacing
        .replace(/kpi\b/gi, 'kπ');                    // "kpi" -> "kπ"
      
      // Convert caret notation for exponents to superscripts
      result = result
        .replace(/\^2\b/g, '²')
        .replace(/\^3\b/g, '³')
        .replace(/\^4\b/g, '⁴')
        .replace(/\^5\b/g, '⁵')
        .replace(/\^6\b/g, '⁶')
        .replace(/\^7\b/g, '⁷')
        .replace(/\^8\b/g, '⁸')
        .replace(/\^9\b/g, '⁹')
        .replace(/\^0\b/g, '⁰')
        .replace(/\^n\b/gi, 'ⁿ')
        .replace(/\^(-?\d+)/g, (match, num) => {
          const superscripts: { [key: string]: string } = {
            '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
            '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
          };
          return num.split('').map((c: string) => superscripts[c] || c).join('');
        });
      
      // Convert common math words to symbols
      result = result
        .replace(/\bsqrt\s*\(/gi, '√(')              // "sqrt(" -> "√("
        .replace(/\bsqrt\s*(\d)/gi, '√$1')           // "sqrt2" -> "√2"
        .replace(/\btheta\b/gi, 'θ')                  // "theta" -> "θ"
        .replace(/\balpha\b/gi, 'α')                  // "alpha" -> "α"
        .replace(/\bbeta\b/gi, 'β')                   // "beta" -> "β"
        .replace(/\bgamma\b/gi, 'γ')                  // "gamma" -> "γ"
        .replace(/\bdelta\b/gi, 'δ')                  // "delta" -> "δ"
        .replace(/\binfinity\b/gi, '∞')               // "infinity" -> "∞"
        .replace(/>=\b/g, '≥')                        // ">=" -> "≥"
        .replace(/<=\b/g, '≤')                        // "<=" -> "≤"
        .replace(/!=/g, '≠')                          // "!=" -> "≠"
        .replace(/<>/g, '≠')                          // "<>" -> "≠"
        .replace(/\+-/g, '±')                         // "+-" -> "±"
        .replace(/\b(\d+)\s*degrees?\b/gi, '$1°')     // "90 degrees" -> "90°"
        .replace(/\bperpendicular\b/gi, '⊥')          // for formulas only
        .replace(/\bcongruent\b/gi, '≅');             // for formulas only
      
      // Convert trig function notation (tan^2 x -> tan²x)
      result = result
        .replace(/sin²/g, 'sin²')
        .replace(/cos²/g, 'cos²')
        .replace(/tan²/g, 'tan²')
        .replace(/sec²/g, 'sec²')
        .replace(/csc²/g, 'csc²')
        .replace(/cot²/g, 'cot²');
      
      // Remove any emoji characters that might cause PDF rendering issues
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
      
      // Fix ampersand-interleaved text corruption
      const ampersandPattern = /(&[a-zA-Z]){3,}/g;
      if (ampersandPattern.test(result)) {
        result = result.replace(/&([a-zA-Z])(?=&|$|\s|\.)/g, '$1');
        result = result.replace(/^&([a-zA-Z])/g, '$1');
      }
      result = result.replace(/&([a-zA-Z])&/g, '$1');
      
      // Fix mojibake patterns (UTF-8 decoded as Latin-1/Windows-1252)
      const mojibakePatterns: [RegExp, string][] = [
        // ============================================================
        // CRITICAL: Common diagnostic worksheet corruption patterns
        // These appear as "d", "A", Å, À where θ or π should be
        // ============================================================
        
        // Theta (θ) corruption patterns
        [/"d"/g, 'θ'],                // "d" -> θ
        [/"d/g, 'θ'],                 // "d -> θ
        [/d"/g, 'θ'],                 // d" -> θ
        [/Ã¸/g, 'θ'],                 // Ã¸ -> θ
        [/θ̈/g, 'θ'],                  // θ with diaeresis
        [/Î¸/g, 'θ'],                 // Î¸ -> θ
        [/\u00f8/g, 'θ'],             // ø -> θ (common substitution)
        
        // Pi (π) corruption patterns  
        [/"A\)/g, 'π)'],              // "A) -> π)
        [/\("A/g, '(π'],              // ("A -> (π
        [/2"A/g, '2π'],               // 2"A -> 2π
        [/"A/g, 'π'],                 // "A -> π
        [/Å/g, 'π'],                  // Å -> π
        [/2Å/g, '2π'],                // 2Å -> 2π
        [/À/g, 'π'],                  // À -> π
        [/2À/g, '2π'],                // 2À -> 2π
        [/Ã€/g, 'π'],                 // Ã€ -> π
        [/Ï€/g, 'π'],                 // Ï€ -> π
        [/\u03c0/g, 'π'],             // Ensure proper π
        [/\u00c0/g, 'π'],             // À character code
        [/\u00c5/g, 'π'],             // Å character code
        [/ãƒ¼/g, 'π'],                // Japanese character corruption
        [/ð/g, 'π'],                  // ð -> π
        
        // Full interval patterns (0 ≤ θ < 2π)
        [/\(0\s*"d"\s*,?\s*<?=?\s*2"A"\)/gi, '(0 ≤ θ < 2π)'],
        [/\(0\s*"d\s*,?\s*<?=?\s*2Å\)/gi, '(0 ≤ θ < 2π)'],
        [/\(0\s*"d\s*,?\s*<?=?\s*2À\)/gi, '(0 ≤ θ < 2π)'],
        [/0\s*≤\s*"d"\s*<\s*2"A"/gi, '0 ≤ θ < 2π'],
        [/0\s*≤\s*"d\s*<\s*2À/gi, '0 ≤ θ < 2π'],
        [/0\s*≤\s*"d\s*<\s*2Å/gi, '0 ≤ θ < 2π'],
        [/0\s*"d\s*,?\s*<\s*2Å/gi, '0 ≤ θ < 2π'],
        [/0\s*"d"\s*<\s*2Å/gi, '0 ≤ θ < 2π'],
        [/0"d"</g, '0 ≤ θ <'],
        [/"d\s*,/g, 'θ ≤'],
        [/"d,/g, 'θ ≤'],
        
        // Square root (√) corruption
        [/âˆš/g, '√'],
        [/\u221a/g, '√'],
        [/V(?=\d)/g, '√'],            // V before number -> √
        [/\\sqrt/g, '√'],             // LaTeX escape
        
        // Superscript corruption
        [/Â²/g, '²'],
        [/Â³/g, '³'],
        [/\^2(?!\d)/g, '²'],
        [/\^3(?!\d)/g, '³'],
        [/\^4(?!\d)/g, '⁴'],
        [/\^5(?!\d)/g, '⁵'],
        [/\^n\b/gi, 'ⁿ'],
        
        // Comparison operators
        [/â‰¤/g, '≤'],
        [/â‰¥/g, '≥'],
        [/â‰ /g, '≠'],
        [/&lt;=/g, '≤'],
        [/&gt;=/g, '≥'],
        [/<=/g, '≤'],
        [/>=/g, '≥'],
        [/!=/g, '≠'],
        [/<>/g, '≠'],
        
        // Greek letters mojibake
        [/Î±/g, 'α'],
        [/Î²/g, 'β'],
        [/Î³/g, 'γ'],
        [/Î"/g, 'Δ'],
        [/Î´/g, 'δ'],
        [/Ïˆ/g, 'ψ'],
        [/Ï†/g, 'φ'],
        [/Î£/g, 'Σ'],
        [/Ïƒ/g, 'σ'],
        [/Î©/g, 'Ω'],
        [/Ï‰/g, 'ω'],
        [/Î»/g, 'λ'],
        [/Î¼/g, 'μ'],
        [/Ï/g, 'ρ'],
        [/Îµ/g, 'ε'],
        [/Î¶/g, 'ζ'],
        [/Î·/g, 'η'],
        [/Î¹/g, 'ι'],
        [/Îº/g, 'κ'],
        [/Î½/g, 'ν'],
        [/Î¾/g, 'ξ'],
        [/Ï€/g, 'π'],
        [/Ï„/g, 'τ'],
        [/Ï…/g, 'υ'],
        [/Ï‡/g, 'χ'],
        
        // Arrows and math operators
        [/â†'/g, '→'],
        [/â†/g, '←'],
        [/âˆž/g, '∞'],
        [/Ã—/g, '×'],
        [/Ã·/g, '÷'],
        [/Â±/g, '±'],
        [/âˆ /g, '∠'],
        [/âŠ¥/g, '⊥'],
        [/â‰…/g, '≅'],
        [/âˆ†/g, '△'],
        [/∥/g, '∥'],
        [/Ã¢Ë†Â¥/g, '∥'],
        
        // Degree symbol
        [/Â°/g, '°'],
        [/°Â/g, '°'],
        [/\bdegrees?\b/gi, '°'],
        
        // Fractions
        [/Â½/g, '½'],
        [/Â¼/g, '¼'],
        [/Â¾/g, '¾'],
        [/1\/2(?!\d)/g, '½'],
        [/1\/3(?!\d)/g, '⅓'],
        [/1\/4(?!\d)/g, '¼'],
        [/2\/3(?!\d)/g, '⅔'],
        [/3\/4(?!\d)/g, '¾'],
        
        // Quote/apostrophe corruption
        [/â€"/g, '—'],
        [/â€™/g, "'"],
        [/â€œ/g, '"'],
        [/â€/g, '"'],
        [/â€˜/g, "'"],
        [/â€¦/g, '...'],
        [/â€"/g, '-'],
        
        // Common Â prefix corruption cleanup
        [/Â\s*π/g, 'π'],
        [/Âπ/g, 'π'],
        [/πÂ/g, 'π'],
        [/Âθ/g, 'θ'],
        [/θÂ/g, 'θ'],
        [/Â·/g, '·'],
        [/Âµ/g, 'μ'],
        
        // Number + corrupted π patterns
        [/(\d)Â(?=\s|$|\.)/g, '$1π'],
        [/(\d)Â\s*cm/gi, '$1π cm'],
        [/(\d)Â\s*cubic/gi, '$1π cubic'],
        [/(\d)Â\s*square/gi, '$1π square'],
        [/(\d)Â\s*meter/gi, '$1π meter'],
        [/(\d)Â\s*inch/gi, '$1π inch'],
        [/(\d)Â\s*unit/gi, '$1π unit'],
        [/(\d)\s*À/g, '$1π'],
        [/(\d)\s*Å/g, '$1π'],
        
        // Trig function cleanup
        [/sin\s*²/g, 'sin²'],
        [/cos\s*²/g, 'cos²'],
        [/tan\s*²/g, 'tan²'],
        [/sec\s*²/g, 'sec²'],
        [/csc\s*²/g, 'csc²'],
        [/cot\s*²/g, 'cot²'],
        
        // cos² patterns with corrupted symbols
        [/4\s*cos\s*²\s*,/g, '4cos²θ'],
        [/cos²\s*,/g, 'cos²θ'],
        [/sin²\s*,/g, 'sin²θ'],
        [/tan²\s*,/g, 'tan²θ'],
        
        // ============================================================
        // CRITICAL FIX: Remove spurious _2, _n patterns in wrong places
        // These appear when AI generates corrupted text like "cm_2", "water_2"
        // ============================================================
        
        // Remove _2, _n etc from WORDS (not single letters) - these are corruption
        // Patterns like "meters_2", "capacity_2", "First_2", "water_2" should be cleaned
        [/(\w{2,})_2\b/g, '$1'],           // words ending in _2 -> remove
        [/(\w{2,})_1\b/g, '$1'],           // words ending in _1 -> remove  
        [/(\w{2,})_3\b/g, '$1'],           // words ending in _3 -> remove
        [/(\w{2,})_n\b/gi, '$1'],          // words ending in _n -> remove
        [/(\w{2,})_0\b/g, '$1'],           // words ending in _0 -> remove
        
        // Fix split words (space corruption) - "formu la" -> "formula", "calcu late" -> "calculate"
        [/\bformu\s+la\b/gi, 'formula'],
        [/\bfirst\s*_?\s*2?\s*,?\s*calculate\b/gi, 'First, calculate'],
        [/\bcalcu\s+late\b/gi, 'calculate'],
        [/\brect\s+angle\b/gi, 'rectangle'],
        [/\bcy\s+linder\b/gi, 'cylinder'],
        [/\bcylin\s+drical\b/gi, 'cylindrical'],
        [/\bpris\s+m\b/gi, 'prism'],
        [/\bvol\s+ume\b/gi, 'volume'],
        [/\bca\s+pacity\b/gi, 'capacity'],
        [/\bra\s+dius\b/gi, 'radius'],
        [/\bdia\s+meter\b/gi, 'diameter'],
        [/\bheig\s+ht\b/gi, 'height'],
        [/\bwid\s+th\b/gi, 'width'],
        [/\blen\s+gth\b/gi, 'length'],
        [/\bcir\s+cle\b/gi, 'circle'],
        [/\bsqu\s+are\b/gi, 'square'],
        [/\btri\s+angle\b/gi, 'triangle'],
        [/\bperi\s+meter\b/gi, 'perimeter'],
        [/\bare\s+a\b/gi, 'area'],
        [/\bsur\s+face\b/gi, 'surface'],
        [/\bcub\s+ic\b/gi, 'cubic'],
        [/\bme\s+ters?\b/gi, 'meter$1'],
        [/\bwa\s+ter\b/gi, 'water'],
        
        // Remove orphaned _2 at word boundaries that didn't get caught
        [/\s_2\s/g, ' '],
        [/\s_1\s/g, ' '],
        [/\s_n\s/gi, ' '],
        
        // ============================================================
        // SUBSCRIPT CORRUPTION PATTERNS - ONLY for single letter variables
        // w• should be w₁, etc. - these are VALID subscripts for variables
        // ============================================================
        
        // Subscript 1 corruption (• bullet often replaces ₁) - ONLY for single letters
        [/\b([a-zA-Z])•/g, '$1₁'],           // w• -> w₁
        [/\b([a-zA-Z])â€¢/g, '$1₁'],          // mojibake bullet
        [/\b([a-zA-Z])\u2022/g, '$1₁'],       // unicode bullet
        [/\b([a-zA-Z])·(?=\s|$|[,;.])/g, '$1₁'],  // middle dot at word boundary
        [/\b([a-zA-Z])¹(?=\s|$|[,;.])/g, '$1₁'],  // superscript 1 -> subscript 1
        
        // Subscript 2 corruption - only in specific variable contexts
        // NOT general "_2" patterns which are handled above
        [/\b([a-zA-Z])²(?=\s+and|\s+or)/gi, '$1₂'], // w² and -> w₂ and (context-aware)
        
        // Subscript 3 corruption (ƒ often replaces ₃ or f) - ONLY single letters
        [/\b([a-zA-Z])ƒ/g, '$1₃'],            // wƒ -> w₃
        [/\b([a-zA-Z])Æ'/g, '$1₃'],           // mojibake for ƒ
        
        // Direct subscript patterns - ONLY after single letters (variables like x₁, y₂)
        [/\b([a-zA-Z])_1\b/g, '$1₁'],
        [/\b([a-zA-Z])_2\b/g, '$1₂'],
        [/\b([a-zA-Z])_3\b/g, '$1₃'],
        [/\b([a-zA-Z])_4\b/g, '$1₄'],
        [/\b([a-zA-Z])_5\b/g, '$1₅'],
        [/\b([a-zA-Z])_n\b/gi, '$1ₙ'],
        [/\b([a-zA-Z])_0\b/g, '$1₀'],
      ];
      
      for (const [pattern, replacement] of mojibakePatterns) {
        result = result.replace(pattern, replacement);
      }
      
      // Clean up remaining artifacts
      result = result
        .replace(/Â(?![a-zA-Z0-9°²³])/g, '')
        .replace(/Â\s+/g, ' ')
        .replace(/\s+Â/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      return result;
    }

    // Parse the JSON response with robust handling for truncated responses
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
      cleanContent = cleanContent.trim();
      
      // Check if response appears truncated (doesn't end with valid JSON array closing)
      if (!cleanContent.endsWith(']')) {
        console.warn('Detected truncated JSON response, attempting to recover...');
        console.warn('Last 100 chars:', cleanContent.slice(-100));
        
        // More robust recovery: find all complete objects and close the array
        // Use bracket depth tracking to find complete objects
        let depth = 0;
        let inString = false;
        let escape = false;
        let lastCompleteObjEnd = -1;
        let objectCount = 0;
        
        for (let i = 0; i < cleanContent.length; i++) {
          const char = cleanContent[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\' && inString) {
            escape = true;
            continue;
          }
          
          if (char === '"' && !escape) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              depth++;
            } else if (char === '}') {
              depth--;
              if (depth === 1) { // Back to array level after closing an object
                lastCompleteObjEnd = i;
                objectCount++;
              }
            } else if (char === '[' && depth === 0) {
              depth = 1; // Array start
            }
          }
        }
        
        if (lastCompleteObjEnd > 0 && objectCount > 0) {
          cleanContent = cleanContent.substring(0, lastCompleteObjEnd + 1) + ']';
          console.log(`Recovered ${objectCount} complete question objects from truncated response`);
        } else {
          // Fallback: try regex patterns
          const lastCompleteObjMatch = cleanContent.match(/^(\[[\s\S]*\})\s*,?\s*\{[^}]*$/);
          if (lastCompleteObjMatch) {
            cleanContent = lastCompleteObjMatch[1] + ']';
            console.log('Recovered partial response with regex');
          } else {
            const arrayMatch = cleanContent.match(/^\[[\s\S]*?\}(?=\s*,\s*\{|\s*\])/);
            if (arrayMatch) {
              cleanContent = arrayMatch[0] + ']';
              console.log('Recovered minimal response');
            } else {
              console.error('Cannot recover truncated response:', cleanContent.substring(0, 500));
              throw new Error('AI response was truncated. Please try with fewer questions or a simpler topic.');
            }
          }
        }
      }
      
      // Parse the JSON
      questions = JSON.parse(cleanContent);
      
      // Validate we got an array
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }
      
      // Filter out any incomplete question objects
      questions = questions.filter(q => 
        q && typeof q === 'object' && 
        q.question && typeof q.question === 'string' &&
        q.topic && typeof q.topic === 'string'
      );
      
      if (questions.length === 0) {
        throw new Error('No valid questions in response');
      }
      
      console.log(`Successfully parsed ${questions.length} questions`);
      
      // Sanitize all question text to fix encoding issues
      questions = questions.map(q => ({
        ...q,
        question: sanitizeMathText(q.question),
        answer: q.answer ? sanitizeMathText(q.answer) : q.answer,
        hint: q.hint ? sanitizeMathText(q.hint) : q.hint,
        imagePrompt: q.imagePrompt ? sanitizeMathText(q.imagePrompt) : q.imagePrompt,
      }));
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.substring(0, 500));
      console.error('Parse error details:', parseError);
      console.error('Response length:', content.length, 'chars');
      throw new Error('Failed to parse generated questions. The AI response may have been truncated. Please try again with fewer questions.');
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
