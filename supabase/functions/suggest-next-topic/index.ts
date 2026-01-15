import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TopicInfo {
  name: string;
  standard: string;
  category: string;
}

// NYS Curriculum progression - categories in recommended learning order
const CURRICULUM_PROGRESSION = {
  algebra1: [
    'EXPRESSIONS AND EQUATIONS',
    'LINEAR FUNCTIONS',
    'SYSTEMS OF EQUATIONS',
    'QUADRATICS',
    'FUNCTIONS',
    'STATISTICS',
  ],
  geometry: [
    'TOOLS OF GEOMETRY',
    'LINES AND ANGLES',
    'TRIANGLES',
    'SIMILARITY AND CONGRUENCE',
    'POLYGONS',
    'COORDINATE GEOMETRY',
    'TRANSFORMATIONS',
    'CONICS',
    'TRIGONOMETRY',
    'AREA AND VOLUME',
    'LOGIC',
  ],
  algebra2: [
    'POLYNOMIAL FUNCTIONS',
    'RATIONAL EXPRESSIONS',
    'RADICALS AND COMPLEX NUMBERS',
    'EXPONENTIAL AND LOGARITHMIC FUNCTIONS',
    'TRIGONOMETRIC FUNCTIONS',
    'SEQUENCES AND SERIES',
    'PROBABILITY AND STATISTICS',
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      currentTopic, 
      masteredTopics = [], 
      studentName,
      studentStrengths = [],
      studentWeaknesses = [],
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about student progress
    const masteredList = masteredTopics.length > 0 
      ? masteredTopics.join(', ') 
      : 'None yet';
    
    const strengthsInfo = studentStrengths.length > 0
      ? `Strengths: ${studentStrengths.join(', ')}`
      : '';
    
    const weaknessesInfo = studentWeaknesses.length > 0
      ? `Areas needing attention: ${studentWeaknesses.join(', ')}`
      : '';

    const systemPrompt = `You are an expert math curriculum advisor for NYS Regents standards. Your role is to recommend the next topic a student should study based on their mastery progression.

Consider these principles:
1. Prerequisites: Some topics build on others (e.g., solving equations before systems)
2. Cognitive load: Don't jump to significantly harder topics too quickly
3. Spiral learning: Revisiting related concepts strengthens understanding
4. Student strengths: Leverage areas where students excel
5. Fill gaps: If foundational topics are missing, recommend them first

NYS Curriculum Categories (in recommended order):
- Algebra 1: ${CURRICULUM_PROGRESSION.algebra1.join(' → ')}
- Geometry: ${CURRICULUM_PROGRESSION.geometry.join(' → ')}
- Algebra 2: ${CURRICULUM_PROGRESSION.algebra2.join(' → ')}`;

    const userPrompt = `Student: ${studentName}

Just mastered: ${currentTopic}
Previously mastered topics: ${masteredList}
${strengthsInfo}
${weaknessesInfo}

Based on the NYS Regents curriculum and this student's progress, recommend the next topic they should study. Provide:
1. The recommended next topic name (must match NYS curriculum topics)
2. The NYS standard code for the topic
3. A brief explanation (2-3 sentences) of why this topic is the best next step
4. Any prerequisite review topics if needed`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_next_topic",
              description: "Suggest the next curriculum topic for the student to study",
              parameters: {
                type: "object",
                properties: {
                  nextTopic: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "The topic name" },
                      standard: { type: "string", description: "NYS standard code (e.g., A.REI.B.3)" },
                      category: { type: "string", description: "The category this topic belongs to" },
                    },
                    required: ["name", "standard", "category"],
                  },
                  reasoning: { 
                    type: "string", 
                    description: "2-3 sentence explanation of why this topic is recommended" 
                  },
                  prerequisiteReview: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of topics to briefly review before starting (if any)",
                  },
                  alternativeTopics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        standard: { type: "string" },
                        reason: { type: "string" },
                      },
                    },
                    description: "1-2 alternative topics if the primary recommendation doesn't fit",
                  },
                  difficultyProgression: {
                    type: "string",
                    enum: ["natural", "stretch", "consolidate"],
                    description: "Whether this is a natural next step, a stretch challenge, or consolidation",
                  },
                },
                required: ["nextTopic", "reasoning", "difficultyProgression"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_next_topic" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_next_topic") {
      throw new Error("Invalid response from AI");
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({
      success: true,
      suggestion,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("suggest-next-topic error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
