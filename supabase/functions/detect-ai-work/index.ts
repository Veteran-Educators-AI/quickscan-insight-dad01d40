import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DetectAIRequest {
  text: string;
  studentName?: string;
  questionContext?: string;
}

interface AIDetectionResult {
  isLikelyAI: boolean;
  confidence: number;
  indicators: string[];
  explanation: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, studentName, questionContext }: DetectAIRequest = await req.json();

    if (!text || text.trim().length < 20) {
      return new Response(
        JSON.stringify({ 
          isLikelyAI: false, 
          confidence: 0, 
          indicators: [], 
          explanation: "Text too short to analyze" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at detecting AI-generated student work vs genuine student responses. 
Analyze the provided text that was supposedly written by a student answering a math/academic question.

Look for these AI indicators:
1. Overly formal or academic language uncommon for students
2. Perfect grammar and punctuation throughout
3. Structured bullet points or numbered lists (unusual for handwritten work)
4. Generic explanations that don't show personal understanding
5. Lack of calculation errors or scratch work
6. Phrases like "Let me explain", "In conclusion", "It's important to note"
7. Overly verbose explanations for simple concepts
8. Perfect step-by-step formatting that seems too organized
9. Use of advanced vocabulary unexpected for the grade level
10. Responses that don't show typical student thinking patterns

Also look for signs of genuine student work:
1. Minor spelling or grammar errors
2. Informal language or shortcuts
3. Showing work with occasional mistakes then corrections
4. Personal expressions like "I think", "I got confused here"
5. Incomplete sentences or thoughts
6. Evidence of struggle with the problem

You MUST respond with a valid JSON object only, no other text:
{
  "isLikelyAI": boolean,
  "confidence": number between 0 and 100,
  "indicators": ["list of specific indicators found"],
  "explanation": "brief explanation of the assessment"
}`;

    const userPrompt = `Analyze this student work for AI detection:
${questionContext ? `\nQuestion context: ${questionContext}` : ''}
${studentName ? `\nStudent: ${studentName}` : ''}

Student's response:
"""
${text}
"""

Respond with JSON only.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let result: AIDetectionResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      result = {
        isLikelyAI: false,
        confidence: 0,
        indicators: [],
        explanation: "Unable to analyze - parsing error"
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in detect-ai-work:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        isLikelyAI: false,
        confidence: 0,
        indicators: [],
        explanation: "Error during analysis"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
