import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function callLovableAI(prompt: string, imageBase64: string, supabase?: any, userId?: string): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const startTime = Date.now();
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { 
          role: 'user', 
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      max_tokens: 4000,
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
  const latencyMs = Date.now() - startTime;
  
  // Log token usage for cost monitoring
  const usage = data.usage || {};
  console.log(`[TOKEN_USAGE] function=extract-answer-key model=gemini-2.5-flash-lite prompt_tokens=${usage.prompt_tokens || 0} completion_tokens=${usage.completion_tokens || 0} total_tokens=${usage.total_tokens || 0} latency_ms=${latencyMs}`);
  
  // Log to database if supabase client is provided
  if (supabase && userId) {
    await logAIUsage(supabase, userId, 'extract-answer-key', usage, latencyMs);
  }
  
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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authenticatedUserId = user.id;

    const { imageBase64, imageUrl, teacherId, mode = 'simple' } = await req.json();
    
    // Support both base64 and URL formats
    const imageData = imageBase64 || imageUrl;
    if (!imageData) {
      throw new Error('Image data is required (imageBase64 or imageUrl)');
    }

    // Use authenticated user ID, fall back to provided teacherId
    const effectiveTeacherId = authenticatedUserId || teacherId;

    // Initialize Supabase client for rate limiting
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // Check rate limit
    if (supabase && effectiveTeacherId) {
      const rateLimit = await checkRateLimit(supabase, effectiveTeacherId);
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: rateLimit.message,
          rateLimited: true
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Extracting answer key (mode: ${mode})...`);

    // Different prompts based on mode
    let prompt: string;
    
    if (mode === 'worksheet') {
      prompt = `Analyze this teacher answer key worksheet image and extract structured information.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "The question or problem text if visible",
      "correctAnswer": "The complete correct answer with all work shown",
      "partialCreditGuidelines": "Guidelines for partial credit (e.g., '50% for correct setup but wrong calculation')",
      "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"],
      "points": 4
    }
  ]
}

Extract ALL visible questions with:
1. Complete correct answers with all steps
2. Any notes about partial credit or grading
3. Common mistakes to watch for
4. Point values if specified

If information is not visible, make reasonable inferences. Return ONLY the JSON object, no other text.`;
    } else {
      prompt = `You are analyzing an image of correct student work (an answer key). Your task is to extract the complete solution and answer.

Extract:
1. The final answer (numerical value, expression, or statement)
2. All work shown (equations, steps, diagrams described)
3. Any mathematical expressions or formulas used

Format your response as:
**Final Answer:** [the answer]

**Solution Steps:**
[numbered list of steps/work shown]

Be precise and include all mathematical notation. If there are diagrams, describe them briefly.`;
    }

    // Prepare image content - support both base64 and URL
    let imageContent: { type: string; image_url: { url: string } };
    if (imageUrl) {
      imageContent = { type: 'image_url', image_url: { url: imageUrl } };
    } else {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      imageContent = { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } };
    }

    const extractedText = await callLovableAI(prompt, imageContent.image_url.url.replace(/^data:image\/[a-z]+;base64,/, ''), supabase, effectiveTeacherId);

    console.log('Answer extraction complete');

    // Parse response based on mode
    if (mode === 'worksheet') {
      try {
        // Try to extract JSON from the response
        const jsonMatch = extractedText.match(/\{[\s\S]*"questions"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify({
            success: true,
            questions: parsed.questions || [],
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
      
      // Fallback if parsing fails
      return new Response(JSON.stringify({
        success: true,
        questions: [{
          questionNumber: 1,
          questionText: 'Extracted from answer key',
          correctAnswer: extractedText.substring(0, 500),
          partialCreditGuidelines: 'Award partial credit for correct approach',
          commonMistakes: ['Calculation errors', 'Missing units', 'Incomplete work'],
          points: 4,
        }],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      answerText: extractedText,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting answer:', error);
    
    // Handle structured errors with status codes
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      return new Response(
        JSON.stringify({ success: false, error: (error as { message: string }).message }),
        { status: (error as { status: number }).status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
