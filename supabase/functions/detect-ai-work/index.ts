import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DetectAIRequest {
  text: string;
  studentName?: string;
  questionContext?: string;
  teacherId?: string;
}

interface AIDetectionResult {
  isLikelyAI: boolean;
  confidence: number;
  indicators: string[];
  explanation: string;
}

// Check rate limit for a user
async function checkRateLimit(supabase: any, userId: string): Promise<{ allowed: boolean; message?: string }> {
  const { data, error } = await supabase.rpc('check_ai_rate_limit', { p_user_id: userId });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
  
  if (!data.allowed) {
    if (data.hourly_remaining === 0) {
      return { allowed: false, message: `Hourly AI limit reached (${data.hourly_limit}/hour).` };
    }
    if (data.daily_remaining === 0) {
      return { allowed: false, message: `Daily AI limit reached (${data.daily_limit}/day).` };
    }
  }
  
  return { allowed: true };
}

// Log AI usage to database
async function logAIUsage(
  supabase: any, 
  userId: string, 
  functionName: string, 
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
  latencyMs: number
) {
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    function_name: functionName,
    prompt_tokens: usage.prompt_tokens || 0,
    completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    latency_ms: latencyMs,
  });
  
  if (error) {
    console.error('Failed to log AI usage:', error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, studentName, questionContext, teacherId }: DetectAIRequest = await req.json();

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

    // Initialize Supabase client for rate limiting
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // Check rate limit
    if (supabase && teacherId) {
      const rateLimit = await checkRateLimit(supabase, teacherId);
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: rateLimit.message,
          rateLimited: true,
          isLikelyAI: false,
          confidence: 0,
          indicators: [],
          explanation: "Rate limit exceeded"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are a precise and factual analyst detecting AI-generated student work. Your goal is to provide assessment based STRICTLY on observable textual patterns.

HALLUCINATION-SHIELD PROTOCOL:
1. GROUNDING: Base your analysis ONLY on patterns you can directly observe in the text. Do NOT assume or infer student intent.
2. ADMISSION OF UNCERTAINTY: If evidence is inconclusive, state "INSUFFICIENT EVIDENCE to determine [X]". Do NOT force a conclusion.
3. SOURCE ATTRIBUTION: For EVERY indicator claimed, quote the EXACT text showing it: "Found '[exact quote]' which indicates..."
4. NO CREATIVE INTERPRETATION: Report ONLY what is actually present in the text.
5. VERIFICATION: Before including any indicator, verify you can cite exact textual evidence.

Analyze for these AI indicators (ONLY if you can cite specific evidence):
1. Overly formal or academic language - CITE the specific phrase
2. Perfect grammar and punctuation throughout - CITE examples or note exceptions
3. Structured bullet points or numbered lists (unusual for handwritten work)
4. Generic explanations without personal understanding markers
5. Lack of calculation errors or scratch work indicators
6. Phrases like "Let me explain", "In conclusion", "It's important to note" - QUOTE if found
7. Overly verbose explanations for simple concepts - CITE example
8. Perfect step-by-step formatting
9. Advanced vocabulary unexpected for grade level - CITE specific words
10. Absence of typical student thinking patterns

Signs of genuine student work (CITE if found):
1. Minor spelling or grammar errors - QUOTE examples
2. Informal language or shortcuts - QUOTE examples
3. Personal expressions like "I think", "I got confused here" - QUOTE if present
4. Incomplete sentences or thoughts
5. Evidence of struggle with the problem

CRITICAL: If you cannot find clear evidence either way, set confidence LOW and explain what is missing.

You MUST respond with a valid JSON object only, no other text:
{
  "isLikelyAI": boolean,
  "confidence": number between 0 and 100,
  "indicators": ["list of specific indicators with QUOTED evidence from the text"],
  "explanation": "brief explanation citing specific textual evidence"
}`;

    const userPrompt = `Analyze this student work for AI detection:
${questionContext ? `\nQuestion context: ${questionContext}` : ''}
${studentName ? `\nStudent: ${studentName}` : ''}

Student's response:
"""
${text}
"""

Respond with JSON only.`;

    const startTime = Date.now();
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
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
    const latencyMs = Date.now() - startTime;
    
    // Log token usage for cost monitoring
    const usage = data.usage || {};
    console.log(`[TOKEN_USAGE] function=detect-ai-work model=gemini-2.5-flash-lite prompt_tokens=${usage.prompt_tokens || 0} completion_tokens=${usage.completion_tokens || 0} total_tokens=${usage.total_tokens || 0} latency_ms=${latencyMs}`);
    
    // Log to database if supabase client is provided
    if (supabase && teacherId) {
      await logAIUsage(supabase, teacherId, 'detect-ai-work', usage, latencyMs);
    }
    
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
