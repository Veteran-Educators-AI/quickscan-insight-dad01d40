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

interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  difficulty: 'medium' | 'hard' | 'challenging';
  svg?: string;
  imageUrl?: string;
  imagePrompt?: string;
}

async function callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate limit exceeded. Please try again in a moment.' };
    }
    if (response.status === 403) {
      throw { status: 403, message: 'API key invalid or quota exceeded. Please check your Google API key settings.' };
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content in Gemini response');
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics, questionCount, difficultyLevels, includeGeometry, includeFormulas, includeGraphPaper, includeCoordinateGeometry, useAIImages } = await req.json() as {
      topics: TopicInput[];
      questionCount: number;
      difficultyLevels?: string[];
      includeGeometry?: boolean;
      includeFormulas?: boolean;
      includeGraphPaper?: boolean;
      includeCoordinateGeometry?: boolean;
      useAIImages?: boolean;
    };

    if (!topics || topics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No topics provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
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

    // Build optional instructions for geometry and formulas
    let geometryInstruction = '';
    if (includeGeometry) {
      if (useAIImages) {
        // When using AI images, ask for image prompts instead of SVGs
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

    const exampleOutput = useAIImages
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

    const prompt = `You are an expert math educator creating a worksheet for NYS Regents preparation.

Based on the following standards and topics, generate exactly ${questionCount} higher-order thinking questions that require students to apply, analyze, or evaluate concepts. The questions should be challenging but appropriate for high school students.

TOPICS:
${topicsList}

REQUIREMENTS:
1. Generate exactly ${questionCount} questions total
2. Distribute questions across the topics (approximately ${questionsPerTopic} per topic)
3. Focus on higher-order thinking skills (Bloom's Taxonomy levels: Apply, Analyze, Evaluate, Create)
4. Include multi-step problems that require showing work
5. ${difficultyInstruction}
6. Use real-world contexts where appropriate
7. Questions should be clear and unambiguous${geometryInstruction}${formulasInstruction}${graphPaperInstruction}${coordinateGeometryInstruction}

Respond with a JSON array of questions in this exact format:
${exampleOutput}
${imageFieldNote}

Difficulty levels allowed: ${allowedDifficulties.join(', ')}

IMPORTANT: Return ONLY the JSON array, no other text.`;

    const content = await callGeminiAPI(prompt, geminiApiKey);

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
