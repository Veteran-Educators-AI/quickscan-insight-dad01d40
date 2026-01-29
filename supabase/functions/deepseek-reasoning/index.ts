import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReasoningRequest {
  task: "analyze_problem" | "generate_solution" | "verify_answer" | "explain_concept";
  subject: string;
  content: string;
  context?: string;
  difficulty?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY is not configured");
    }

    const request: ReasoningRequest = await req.json();
    const { task, subject, content, context, difficulty } = request;

    console.log(`DeepSeek reasoning request: task=${task}, subject=${subject}, difficulty=${difficulty || 'standard'}`);

    // Build task-specific prompts
    let systemPrompt = `You are an expert ${subject} educator with deep reasoning capabilities. 
You excel at breaking down complex problems into clear, logical steps.
Your explanations are precise and mathematically rigorous.
Always show your reasoning process step-by-step.`;

    let userPrompt = "";

    switch (task) {
      case "analyze_problem":
        userPrompt = `Analyze this ${subject} problem and identify the key concepts, potential misconceptions, and optimal solution approach:

Problem: ${content}
${context ? `Context: ${context}` : ""}
${difficulty ? `Difficulty Level: ${difficulty}` : ""}

Provide:
1. Problem Classification (type of problem)
2. Key Concepts Required
3. Common Misconceptions Students May Have
4. Step-by-Step Solution Strategy
5. Alternative Approaches (if any)`;
        break;

      case "generate_solution":
        userPrompt = `Generate a detailed, step-by-step solution for this ${subject} problem:

Problem: ${content}
${context ? `Context: ${context}` : ""}

Show all work clearly with:
1. Given information
2. What we need to find
3. Formulas/theorems to apply
4. Step-by-step solution with reasoning for each step
5. Final answer with proper units/format
6. Verification of the answer`;
        break;

      case "verify_answer":
        userPrompt = `Verify and analyze this ${subject} solution:

Problem: ${content}
${context ? `Student's Work/Answer: ${context}` : ""}

Analyze:
1. Is the answer correct? (Yes/No/Partial)
2. If incorrect, identify where the error occurred
3. Explain the correct reasoning
4. Provide the correct solution if needed
5. Suggest what the student should review`;
        break;

      case "explain_concept":
        userPrompt = `Explain this ${subject} concept for student understanding:

Concept: ${content}
${context ? `Additional Context: ${context}` : ""}
${difficulty ? `Target Level: ${difficulty}` : ""}

Provide:
1. Clear Definition
2. Why This Concept Matters
3. Key Formulas/Rules with explanations
4. 2-3 Example Applications
5. Common Mistakes to Avoid
6. Connection to Related Topics`;
        break;

      default:
        throw new Error("Invalid task type");
    }

    // Call DeepSeek API - using deepseek-chat for standard, deepseek-reasoner for R1 model
    // Try deepseek-chat first as it's more widely available
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat", // Use deepseek-chat; change to "deepseek-reasoner" for R1 if available
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for precise reasoning
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid DeepSeek API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "DeepSeek credits exhausted. Please add credits to your DeepSeek account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const reasoning = data.choices?.[0]?.message?.content;
    
    // Extract reasoning chain if available (DeepSeek provides this in some models)
    const reasoningChain = data.choices?.[0]?.message?.reasoning_content || null;

    if (!reasoning) {
      throw new Error("No response from DeepSeek");
    }

    console.log(`DeepSeek reasoning completed successfully for task: ${task}`);

    return new Response(
      JSON.stringify({
        success: true,
        task,
        subject,
        reasoning,
        reasoningChain, // Detailed chain-of-thought if available
        model: "deepseek-reasoner",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("DeepSeek reasoning error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to get reasoning response", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
