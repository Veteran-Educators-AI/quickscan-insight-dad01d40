import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TutorRequest {
  type: "explain" | "hint" | "check" | "practice";
  topic: string;
  course: "Algebra 1" | "Algebra 2";
  problem?: string;
  studentAnswer?: string;
  context?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const request: TutorRequest = await req.json();
    const { type, topic, course, problem, studentAnswer, context } = request;

    // Build system prompt based on request type
    let systemPrompt = `You are an expert ${course} tutor aligned with New York State Regents standards. Your teaching style is:
- Patient and encouraging
- Uses step-by-step explanations
- Provides multiple approaches when helpful
- Relates concepts to real-world examples
- Uses proper mathematical notation
- Adapts to the student's level

Format your responses with clear structure using markdown:
- Use **bold** for key terms
- Use bullet points for steps
- Use LaTeX notation for equations when needed (wrap in $ for inline, $$ for display)`;

    let userPrompt = "";

    switch (type) {
      case "explain":
        systemPrompt += "\n\nYou are explaining a mathematical concept. Be thorough but not overwhelming.";
        userPrompt = `Please explain the concept of "${topic}" in ${course}. 
${context ? `Additional context: ${context}` : ""}

Include:
1. A clear definition
2. Key formulas or rules (with explanations of each part)
3. A worked example with step-by-step solution
4. Common mistakes to avoid
5. When this concept appears on the Regents exam`;
        break;

      case "hint":
        systemPrompt += "\n\nYou are providing a hint without giving away the answer. Lead the student to discover the solution themselves.";
        userPrompt = `The student is working on this ${course} problem about ${topic}:

Problem: ${problem}

Please provide a helpful hint that:
1. Identifies what type of problem this is
2. Suggests the first step or approach
3. Reminds them of relevant formulas or concepts
4. Does NOT give away the answer

Keep the hint encouraging and concise.`;
        break;

      case "check":
        systemPrompt += "\n\nYou are checking a student's answer. Be encouraging even if wrong, and explain clearly.";
        userPrompt = `The student is solving this ${course} problem about ${topic}:

Problem: ${problem}
Student's Answer: ${studentAnswer}

Please:
1. Determine if the answer is correct
2. If correct: congratulate them and briefly explain why the solution works
3. If incorrect: 
   - Gently point out where the error occurred
   - Explain the correct approach
   - Show the correct solution with steps
   - Provide a similar practice problem they can try`;
        break;

      case "practice":
        systemPrompt += "\n\nYou are generating practice problems. Create problems appropriate for Regents exam preparation.";
        userPrompt = `Generate 3 practice problems for ${course} on the topic of "${topic}".

For each problem:
1. Write a clear problem statement
2. Indicate difficulty (Easy/Medium/Hard)
3. Provide the correct answer
4. Include a brief explanation of the solution approach

Make sure problems vary in difficulty and cover different aspects of the topic.`;
        break;

      default:
        throw new Error("Invalid request type");
    }

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
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        topic,
        course,
        response: content,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Algebra tutor error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to get tutoring response", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
