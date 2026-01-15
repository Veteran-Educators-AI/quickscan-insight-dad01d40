import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemediationQuestion {
  questionNumber: number;
  question: string;
  targetMisconception: string;
  difficulty: 'scaffolded' | 'practice' | 'challenge';
  hint: string;
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
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: `You are a precise and factual math educator specializing in remediation. Your goal is to create targeted practice questions based STRICTLY on verified misconceptions.

HALLUCINATION-SHIELD PROTOCOL:
1. GROUNDING: Base questions ONLY on the specific misconceptions provided. Do NOT invent or assume additional misconceptions.
2. ADMISSION OF UNCERTAINTY: If a misconception description is unclear, state "CLARIFICATION NEEDED: [what is unclear]" rather than guessing.
3. SOURCE ATTRIBUTION: Each question MUST clearly target the EXACT misconception provided - reference it directly.
4. NO CREATIVE EXPANSION: Do NOT add misconceptions the student "might also have" - work only with what's provided.
5. VERIFICATION: Before including a question, verify it directly addresses the stated misconception.

CRITICAL FORMATTING REQUIREMENTS:
- Use proper mathematical Unicode symbols:
  • Use π (not "pi")
  • Use √ for square roots
  • Use ² ³ ⁴ for exponents
  • Use ° for degrees
  • Use ∠ for angles
  • Use ≤ ≥ ≠ for inequalities
  • Use × for multiplication
  • Use ÷ for division
  • Use θ for angle theta
  • Use ½ ⅓ ¼ ⅔ ¾ for common fractions

Create questions that directly target and remediate ONLY the identified misconceptions. Include scaffolded questions that break down concepts, practice questions for reinforcement, and challenge questions to ensure mastery.

Return only valid JSON arrays when asked for questions.` },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more precise, less creative output
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

    const { misconceptions, problemContext, studentName, questionsPerMisconception = 3 } = await req.json() as {
      misconceptions: string[];
      problemContext?: string;
      studentName?: string;
      questionsPerMisconception?: number;
    };

    if (!misconceptions || misconceptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No misconceptions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating remediation questions for ${misconceptions.length} misconceptions`);

    const misconceptionsList = misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n');
    const totalQuestions = misconceptions.length * questionsPerMisconception;

    const prompt = `Generate ${totalQuestions} targeted remediation questions to address the following student misconceptions:

IDENTIFIED MISCONCEPTIONS:
${misconceptionsList}

${problemContext ? `ORIGINAL PROBLEM CONTEXT:\n${problemContext}\n` : ''}
${studentName ? `STUDENT: ${studentName}\n` : ''}

REQUIREMENTS:
1. Generate ${questionsPerMisconception} questions per misconception
2. For each misconception, include:
   - 1 "scaffolded" question that breaks down the concept step-by-step with guidance
   - 1 "practice" question for reinforcement at medium difficulty  
   - 1 "challenge" question to ensure mastery (only if questionsPerMisconception >= 3)
3. Each question MUST include a helpful hint that guides without giving away the answer
4. Questions should directly address and remediate the specific misconception
5. Use encouraging, student-friendly language
6. Make questions progressively build understanding

Return ONLY a valid JSON array in this exact format:
[
  {
    "questionNumber": 1,
    "question": "The full question text with proper math notation",
    "targetMisconception": "The misconception this question addresses",
    "difficulty": "scaffolded",
    "hint": "A helpful hint for the student"
  }
]

Generate exactly ${totalQuestions} questions covering all misconceptions.`;

    const aiResponse = await callLovableAI(prompt);
    
    // Parse the response
    let questions: RemediationQuestion[];
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', aiResponse);
      throw new Error('Failed to parse remediation questions from AI');
    }

    console.log(`Generated ${questions.length} remediation questions`);

    return new Response(
      JSON.stringify({ 
        questions,
        misconceptions,
        studentName,
        generatedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating remediation questions:', error);
    
    // Handle rate limit errors
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (error.status === 402) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate remediation questions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
