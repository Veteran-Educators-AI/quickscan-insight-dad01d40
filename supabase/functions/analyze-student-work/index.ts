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
    return { allowed: true }; // Allow on error to not block users
  }
  
  if (!data.allowed) {
    if (data.hourly_remaining === 0) {
      return { 
        allowed: false, 
        message: `Hourly AI limit reached (${data.hourly_limit}/hour). Please wait before scanning more work.` 
      };
    }
    if (data.daily_remaining === 0) {
      return { 
        allowed: false, 
        message: `Daily AI limit reached (${data.daily_limit}/day). Limit resets in 24 hours.` 
      };
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

// Helper function to call Lovable AI Gateway with token logging
async function callLovableAI(
  messages: any[], 
  apiKey: string, 
  functionName: string = 'analyze-student-work',
  supabase?: any,
  userId?: string
) {
  const startTime = Date.now();
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
    }
    if (response.status === 402) {
      throw { status: 402, message: "AI credits exhausted. Please add funds to continue." };
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const latencyMs = Date.now() - startTime;
  
  // Log token usage for cost monitoring
  const usage = data.usage || {};
  console.log(`[TOKEN_USAGE] function=${functionName} model=gemini-2.5-flash-lite prompt_tokens=${usage.prompt_tokens || 0} completion_tokens=${usage.completion_tokens || 0} total_tokens=${usage.total_tokens || 0} latency_ms=${latencyMs}`);
  
  // Log to database if supabase client is provided
  if (supabase && userId) {
    await logAIUsage(supabase, userId, functionName, usage, latencyMs);
  }
  
  return data.choices?.[0]?.message?.content || '';
}

// Helper to format image for Lovable AI (OpenAI-compatible format)
function formatImageForLovableAI(imageBase64: string) {
  // Ensure proper data URL format
  let dataUrl = imageBase64;
  if (!imageBase64.startsWith('data:')) {
    dataUrl = `data:image/jpeg;base64,${imageBase64}`;
  }
  
  return {
    type: 'image_url',
    image_url: { url: dataUrl }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const authenticatedUserId = user.id;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, additionalImages, solutionBase64, answerGuideBase64, questionId, rubricSteps, identifyOnly, detectPageType, studentRoster, studentName, teacherId, assessmentMode, promptText, compareMode, standardCode, topicName, customRubric, gradeFloor: customGradeFloor, gradeFloorWithEffort: customGradeFloorWithEffort } = await req.json();
    
    // Ensure teacherId matches authenticated user
    const effectiveTeacherId = teacherId || authenticatedUserId;
    
    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    // If detectPageType is true, check if this is a new paper or continuation
    if (detectPageType) {
      console.log('Detecting page type...');
      const pageType = await detectPageTypeFromImage(imageBase64, LOVABLE_API_KEY);
      return new Response(JSON.stringify({
        success: true,
        pageType,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with service role for sending notifications and rate limiting
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // Check rate limit using effective teacher ID
    if (supabase && effectiveTeacherId) {
      const rateLimit = await checkRateLimit(supabase, effectiveTeacherId);
      if (!rateLimit.allowed) {
        return new Response(JSON.stringify({ 
          error: rateLimit.message,
          rateLimited: true
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If identifyOnly is true, just extract student identification info
    if (identifyOnly) {
      console.log('Identifying student from image...');
      const identification = await identifyStudent(imageBase64, studentRoster, LOVABLE_API_KEY);
      return new Response(JSON.stringify({
        success: true,
        identification,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If compareMode is true, compare student work against provided solution
    if (compareMode && solutionBase64) {
      console.log('Comparing student work against solution...');
      const comparison = await compareWithSolution(imageBase64, solutionBase64, rubricSteps, LOVABLE_API_KEY);
      return new Response(JSON.stringify({
        success: true,
        comparison,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing student work image...');
    console.log('Question ID:', questionId || 'Not specified');
    console.log('Assessment mode:', assessmentMode || 'teacher');
    console.log('Rubric steps provided:', rubricSteps?.length || 0);

    // Fetch teacher settings early (for verbosity and grade floor)
    let feedbackVerbosity = 'concise';
    let gradeFloor = customGradeFloor || 55;
    let gradeFloorWithEffort = customGradeFloorWithEffort || 65;
    
    if (effectiveTeacherId && supabase) {
      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('grade_floor, grade_floor_with_effort, ai_feedback_verbosity')
          .eq('teacher_id', effectiveTeacherId)
          .maybeSingle();
        
        if (settingsData) {
          if (!customGradeFloor) {
            gradeFloor = settingsData.grade_floor ?? 55;
            gradeFloorWithEffort = settingsData.grade_floor_with_effort ?? 65;
          }
          feedbackVerbosity = settingsData.ai_feedback_verbosity ?? 'concise';
        }
      } catch (settingsError) {
        console.error('Error fetching teacher settings:', settingsError);
      }
    }
    console.log('Feedback verbosity:', feedbackVerbosity);

    // Fetch past verification decisions to improve AI grading accuracy
    let verificationContext = '';
    if (supabase && effectiveTeacherId) {
      try {
        const { data: verifications } = await supabase
          .from('interpretation_verifications')
          .select('interpretation, decision, correct_interpretation')
          .eq('teacher_id', effectiveTeacherId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (verifications && verifications.length > 0) {
          const approvedPatterns = verifications
            .filter((v: any) => v.decision === 'approved')
            .map((v: any) => v.interpretation)
            .slice(0, 20);
          
          const rejectedPatterns = verifications
            .filter((v: any) => v.decision === 'rejected')
            .map((v: any) => ({
              wrong: v.interpretation,
              correct: v.correct_interpretation
            }))
            .filter((v: any) => v.correct)
            .slice(0, 20);

          if (approvedPatterns.length > 0 || rejectedPatterns.length > 0) {
            verificationContext = `
TEACHER'S VERIFIED INTERPRETATION PATTERNS (Use these to improve accuracy):

${approvedPatterns.length > 0 ? `APPROVED INTERPRETATIONS - These interpretations were confirmed correct by the teacher:
${approvedPatterns.map((p: string) => `✓ "${p}"`).join('\n')}
` : ''}

${rejectedPatterns.length > 0 ? `REJECTED INTERPRETATIONS - These were wrong, use the corrections instead:
${rejectedPatterns.map((p: any) => `✗ Wrong: "${p.wrong}" → Correct: "${p.correct}"`).join('\n')}
` : ''}

Apply these patterns when making similar interpretations in this student's work.
`;
            console.log(`Loaded ${approvedPatterns.length} approved and ${rejectedPatterns.length} rejected verification patterns`);
          }
        }
      } catch (verifyError) {
        console.error('Error fetching verification patterns:', verifyError);
      }
    }

    // Build the analysis prompt based on assessment mode
    const isAIMode = assessmentMode === 'ai';
    const isTeacherGuidedMode = assessmentMode === 'teacher-guided';
    
    // Teacher-guided mode context - when teacher provides an answer guide
    const teacherGuideContext = answerGuideBase64 ? `
TEACHER-GUIDED GRADING MODE:
You have been provided with the teacher's answer guide/rubric image. 
CRITICAL: Use the teacher's answer guide as the PRIMARY reference for grading.

Instructions:
1. First, analyze the teacher's answer guide to understand:
   - The expected solution steps
   - The correct final answer
   - Any specific grading criteria or point distributions shown
   - The teacher's preferred approach/method

2. Grade the student's work based on how well it matches the teacher's expectations:
   - Compare student's approach to the teacher's expected approach
   - Award points based on matching the teacher's rubric if visible
   - Identify deviations from the expected method

3. Still apply NYS Regents standards, but prioritize the teacher's grading criteria.
` : '';
    
    // NYS Regents scoring guide context - CONCEPT-BASED GRADING
    const regentsContext = `
NYS REGENTS SCORING GUIDELINES - CONCEPT-BASED UNDERSTANDING EVALUATION:
The New York State Regents Examinations use a standards-based scoring approach. 
CRITICAL: Grade based on CONCEPTUAL UNDERSTANDING demonstrated through coherent work.

HOW TO EVALUATE UNDERSTANDING:
1. Count the number of CONCEPTS the student demonstrates understanding of
2. Look for COHERENT WORK that shows logical thinking, even if basic
3. Understanding must be JUSTIFIED with work shown - not just answers
4. More concepts understood = higher grade
5. Even BASIC understanding with coherent work deserves recognition (65+)

SCORE 4 (Exceeding Standards - Grade 90-100):
- Complete mastery of ALL relevant concepts
- Clear, logical reasoning throughout
- All mathematical procedures correctly applied
- Work is well-organized and clearly communicated
- Multiple concepts demonstrated with full understanding

SCORE 3 (Meeting Standards - Grade 80-89):
- Solid understanding of MOST concepts
- Mathematical reasoning is sound with minor gaps
- Work shows clear understanding of core concepts
- May have minor computational errors that don't affect conceptual understanding

SCORE 2 (Approaching Standards - Grade 70-79):
- Understanding of SOME concepts demonstrated
- Partial but coherent work showing logical thinking
- Some correct procedures with gaps in understanding
- Student shows they grasp key ideas even if execution is flawed

SCORE 1 (Basic Understanding Shown - Grade 65-69):
- Shows SOME understanding of at least ONE concept
- ANY coherent work that demonstrates logical thinking
- Even basic/simple work that shows student tried and understood something
- Relevant mathematical work attempted with ANY understanding
- IMPORTANT: If student shows even LIMITED understanding, they MUST get 65+

SCORE 0 (Absolutely No Understanding - Grade 55):
- ONLY for COMPLETELY BLANK responses
- ONLY if there is ZERO relevant work shown
- ONLY if student wrote nothing related to the problem
- THIS SHOULD BE EXTREMELY RARE
- If ANY understanding is shown AT ALL, use Score 1 (65) instead

CRITICAL GRADING RULES:
- MINIMUM GRADE IS 55 - never give 0
- ANY understanding (even basic/limited) = minimum 65
- Look for CONCEPTS understood, not just correct answers
- Coherent work showing thought process = understanding
- More concepts understood with justification = higher grade
- 55 is ONLY for completely blank or completely irrelevant responses
- When in doubt, if student attempted anything relevant → give 65

CONCEPT-BASED GRADE CONVERSION (55-100 Scale):
- Score 4 → 90-100 (Full conceptual mastery)
- Score 3 → 80-89 (Strong understanding of most concepts)
- Score 2 → 70-79 (Partial understanding, some concepts grasped)
- Score 1 → 65-69 (Basic/limited understanding - ANY effort with understanding gets 65+)
- Score 0 → 55 (ONLY for blank/no work at all - VERY RARE)
`;

    // Custom rubric context if provided
    const customRubricContext = customRubric ? `
TEACHER'S CUSTOM RUBRIC (Calibrated to NYS Standards):
${customRubric.criteria.map((c: { name: string; weight: number; description: string }, i: number) => 
  `${i + 1}. ${c.name} (Weight: ${c.weight}%): ${c.description}`
).join('\n')}

Total Points: ${customRubric.totalPoints || 100}
Passing Threshold: ${customRubric.passingThreshold || 65}%

When scoring, apply both this custom rubric AND align to NYS Regents standards.
` : '';

    // Standard-specific context if provided
    const standardContext = standardCode ? `
SPECIFIC STANDARD BEING ASSESSED: ${standardCode}${topicName ? ` - ${topicName}` : ''}

Evaluate the student's work against this standard. When reporting the NYS Standard in your analysis:
- Use CONCISE format: "[CODE] - [Brief 5-10 word synopsis]"
- Example: "6.G.A.1 - Finding area of composite shapes"
- Do NOT include full standard text, long explanations, or curriculum descriptions
` : '';
    
    let systemPrompt: string;
    let userPromptText: string;

    // HALLUCINATION-SHIELD CORE PRINCIPLES - Applied to all AI analysis
    const hallucinationShieldContext = `
CRITICAL ANALYSIS CONSTRAINTS (Hallucination-Shield Protocol):

1. GROUNDING REQUIREMENT: Base your analysis primarily on what you can directly observe in the student's work. 
   - Clearly distinguish between OBSERVED facts and INTERPRETATIONS
   - If work is unclear or illegible, still attempt to interpret but mark as "[INTERPRETATION - VERIFY: probable meaning is X]"

2. SMART INTERPRETATION WITH FLAGGING: When student work is unclear, messy, or has minor errors:
   - Make a reasonable interpretation of what the student likely meant
   - BUT ALWAYS flag interpretations for teacher review: "[INTERPRETATION - VERIFY: Student appears to have meant X]"
   - Consider common student shorthand, notation mistakes, and handwriting variations
   - Give benefit of the doubt to students - a "5" that looks like an "S" is probably a "5" in math context

3. SOURCE ATTRIBUTION: For EVERY claim you make, cite the specific evidence:
   - "Based on student's work in step 2 where they wrote '[exact quote]'..."
   - "The equation on line 3 shows..."
   - For interpretations: "[INTERPRETATION - VERIFY: This appears to be X based on context]"

4. VERIFICATION FLAGS: Mark claims that need teacher confirmation:
   - HIGH CONFIDENCE: Clearly visible and unambiguous
   - MEDIUM CONFIDENCE: Readable but may have alternative interpretations  
   - NEEDS VERIFICATION: "[INTERPRETATION - VERIFY: ...]" - flag for teacher to confirm

5. BALANCED INTERPRETATION (Not overly restrictive):
   - DO interpret what student "probably meant" when context makes it clear
   - DO consider mathematical context (e.g., a variable that looks like a number)
   - DO give students credit for reasonable interpretations of their work
   - BUT flag significant interpretations so teachers can verify: "[INTERPRETATION - VERIFY: ...]"
   - Do NOT fabricate entire solutions or understanding that has no basis in visible work
`;

    if (isAIMode) {
      systemPrompt = `You are a precise and factual NYS Regents mathematics grader. Your goal is to provide assessment based STRICTLY on verified observations from student work.

${hallucinationShieldContext}
${verificationContext}

Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions - cite exactly what you see
2. Identify the mathematical problem the student is solving and which NYS standard it aligns with
3. SOLVE THE PROBLEM YOURSELF to determine the correct answer and approach
4. Compare the student's work against the correct solution using NYS Regents scoring guidelines
5. Determine if the student's answer is mathematically correct - with specific evidence
6. Identify any misconceptions or errors in the student's reasoning - cite the exact work showing this
7. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
8. Provide constructive, standards-aligned feedback based only on observed work

${regentsContext}
${customRubricContext}
${standardContext}

${teacherGuideContext}

CRITICAL: If you cannot clearly read something, make your best interpretation but flag it with "[INTERPRETATION - VERIFY: ...]" for teacher review. Never completely fabricate understanding with no basis in the work.`;

      userPromptText = `Please analyze this student's handwritten math work${isTeacherGuidedMode ? ' using the teacher\'s answer guide as reference' : ' using NYS Regents scoring standards'}.

IMPORTANT: ${isTeacherGuidedMode ? 'Use the teacher\'s answer guide to determine correct answers and grading criteria.' : 'You must solve this problem yourself first to determine the correct answer, then evaluate the student\'s work against NYS standards.'}`;

      if (promptText) {
        userPromptText += `\n\nThe problem statement is: ${promptText}`;
      }

      userPromptText += `

Steps to follow:
1. Extract all text and mathematical content from the image (OCR)
2. Identify the problem being solved and its related NYS standard
3. Solve the problem yourself to get the correct answer
4. Compare the student's solution to your solution
5. Apply NYS Regents scoring rubric (0-4 scale)
6. Convert to 55-100 grade scale`;

    } else {
      systemPrompt = `You are a precise and factual NYS Regents mathematics grader. Your goal is to provide assessment based STRICTLY on verified observations from student work.

${hallucinationShieldContext}
${verificationContext}

Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions - cite exactly what you see
2. Analyze the student's problem-solving approach using NYS Regents scoring guidelines
3. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
4. Identify any misconceptions or errors in the student's reasoning - cite the exact work showing this
5. Provide constructive, standards-aligned feedback based only on observed work

${regentsContext}
${customRubricContext}
${standardContext}

CRITICAL: If you cannot clearly read something, make your best interpretation but flag it with "[INTERPRETATION - VERIFY: ...]" for teacher review. Never completely fabricate understanding with no basis in the work.`;

      userPromptText = `Please analyze this student's handwritten math work using NYS Regents scoring standards.

Extract all text and mathematical content you can see (OCR).
Identify the problem being solved, its related NYS standard, and evaluate the student's approach.`;
    }

    if (rubricSteps && rubricSteps.length > 0) {
      userPromptText += `\n\nTeacher's Rubric Criteria (score each and align to NYS standards):\n`;
      rubricSteps.forEach((step: { step_number: number; description: string; points: number }, i: number) => {
        userPromptText += `${i + 1}. ${step.description} (${step.points} points)\n`;
      });
    }

    userPromptText += `\n\nIMPORTANT - BALANCED GRADING PROTOCOL:

STEP 1 - EVIDENCE COLLECTION (with smart interpretation):
1. Extract all text/equations from the student's work
2. For unclear portions, interpret what student likely meant using context
3. Mark interpretations with "[INTERPRETATION - VERIFY: X]" so teacher can confirm
4. Consider mathematical context - give students benefit of the doubt

STEP 2 - CONCEPT-BASED GRADING (cite your sources):
1. Identify ALL concepts the student demonstrates - cite the specific work showing each
2. Look for COHERENT work that shows logical thinking (even if basic)
3. ANY understanding shown = minimum grade of 65
4. 55 is ONLY for completely blank/no work at all
5. More concepts understood with coherent justification = higher grade

STEP 3 - FLAG FOR TEACHER VERIFICATION:
1. Mark any significant interpretations with "[INTERPRETATION - VERIFY: ...]"
2. For unclear/ambiguous work, provide your best interpretation BUT flag it
3. Teacher will review and confirm flagged items

Provide your analysis in the following structure:
- OCR Text: (extracted content - include interpretations marked as "[INTERPRETATION - VERIFY: probable reading is X]")
- Interpretations Made: (LIST any interpretations that need teacher verification)
- Problem Identified: (what problem the student is solving - BRIEF description only, under 20 words)
- NYS Standard: (CONCISE format ONLY: "[CODE] - [Brief 5-10 word description]". Example: "6.G.A.1 - Finding area of composite shapes". Do NOT include full standard text or long explanations.)` + (isAIMode ? `
- Correct Solution: (your step-by-step solution to the problem)` : '') + `
- Concepts Demonstrated: (LIST each concept with citation from their work)
- Coherent Work Shown: (YES or NO - does the student show logical thinking/work, even if simple?)
- Approach Analysis: (evaluation of their method - focus on what they UNDERSTAND)
- Is Correct: (YES or NO - is the final answer mathematically correct?)
- Regents Score: (0, 1, 2, 3, or 4 - remember: ANY understanding = Score 1 minimum)
- Regents Score Justification: (why this score - cite evidence)
- Rubric Scores: (if teacher rubric provided, score each criterion)
- Misconceptions: (DETAILED FORMAT FOR EACH ERROR - use EXACT quotes from student work:
    "ERROR: Student wrote '[exact quote from their work]' when solving [specific step].
     EXPECTED: [What the correct step should be with correct values].
     IMPACT: [Specific consequence - e.g., 'This gave final answer of X instead of Y']"
    Be SPECIFIC with direct quotes. Do not use vague descriptions.)
- Needs Teacher Review: (list items flagged for verification)
- Total Score: (points earned / total possible from teacher rubric)
- Standards Met: (YES or NO - does work show ANY understanding of the standards?)
- Grade: (55-100 scale based on concepts understood:
    • 90-100 = Full mastery of all concepts
    • 80-89 = Strong understanding of most concepts  
    • 70-79 = Partial understanding, some concepts grasped
    • 65-69 = Basic/limited understanding shown (DEFAULT if ANY work with understanding)
    • 55 = ONLY if completely blank or NO understanding whatsoever)
` + (feedbackVerbosity === 'detailed' ? `
- Grade Justification: (DETAILED - 150-200 words. Include: 1) Complete breakdown of each error with exact citations from student work, 2) Explanation of WHY each error is mathematically incorrect, 3) What the correct approach should have been step-by-step, 4) How each error affected the final grade. Be thorough and educational.)
- Feedback: (DETAILED - 100-150 words. Provide comprehensive suggestions for improvement including: specific practice topics, common pitfalls to avoid, study strategies, and encouragement. Be constructive and educational.)` : `
- Grade Justification: (CONCISE - under 75 words. Format: "DEDUCTIONS: [specific errors]. STRENGTHS: [what was correct]. RESULT: [final reasoning]")
- Feedback: (constructive suggestions - under 40 words)`) + `\``;

    // Build messages for Lovable AI
    // If additionalImages provided, include all pages as a multi-page paper
    const imageContent: any[] = [
      { type: 'text', text: userPromptText },
      formatImageForLovableAI(imageBase64),
    ];
    
    // Add teacher's answer guide if provided (teacher-guided mode)
    if (answerGuideBase64) {
      imageContent.push({ type: 'text', text: '\n\n[TEACHER\'S ANSWER GUIDE - Use this as the primary reference for grading:]' });
      imageContent.push(formatImageForLovableAI(answerGuideBase64));
    }
    
    // Add additional pages if this is a multi-page paper
    if (additionalImages && Array.isArray(additionalImages) && additionalImages.length > 0) {
      imageContent.push({ type: 'text', text: '\n\n[CONTINUATION PAGE(S) - Same student, same problem, additional work follows:]' });
      for (const addImage of additionalImages) {
        imageContent.push(formatImageForLovableAI(addImage));
      }
    }
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: imageContent
      }
    ];

    const analysisText = await callLovableAI(messages, LOVABLE_API_KEY);

    if (!analysisText) {
      throw new Error('No analysis returned from AI');
    }

    console.log('Analysis complete');

    // Settings were already fetched earlier in the function

    // Parse the structured response with grade floor settings
    const result = parseAnalysisResult(analysisText, rubricSteps, gradeFloor, gradeFloorWithEffort);

    // Suppress raw analysis from client if requested by implicit request structure (by not including it unless debug mode is somehow active, but for now we'll send it)
    // The user requested to remove raw score display from UI, but checking backend logic too.
    // The request was "fix this so the raw score doesn't show and only the actual grade shows on the paper , right now the raw score is showing 0, i only need the grade to show"
    // This seems to refer to UI display of `raw_score_earned`/`possible` which maps to `totalScore` in `result`. 
    
    // In parseAnalysisResult, result.totalScore.percentage is calculated.
    // The UI (AnalysisResults.tsx) was showing a Progress bar based on `grade` which I commented out.
    // The BatchQueue.tsx was showing `result.totalScore.percentage`.
    // I updated BatchQueue to prefer `result.grade`.

    // Send push notification to teacher if teacherId is provided
    if (teacherId && supabase) {
      try {
        const notificationTitle = studentName 
          ? `${studentName}'s work analyzed` 
          : 'Student work analyzed';
        const notificationBody = `Score: ${result.totalScore.earned}/${result.totalScore.possible} (${result.totalScore.percentage}%)`;
        
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: teacherId,
            title: notificationTitle,
            body: notificationBody,
            data: { url: '/scan' },
          },
        });
        console.log('Push notification sent to teacher');
      } catch (notifError) {
        console.error('Failed to send push notification:', notifError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: result,
      rawAnalysis: analysisText,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in analyze-student-work:', error);
    
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (error.status === 402) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface ComparisonResult {
  suggestedScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  totalScore: { earned: number; possible: number; percentage: number };
  misconceptions: string[];
  feedback: string;
  correctnessAnalysis: string;
  rawComparison: string;
}

interface RubricStep {
  step_number: number;
  description: string;
  points: number;
}

async function compareWithSolution(
  studentImageBase64: string,
  solutionImageBase64: string,
  rubricSteps: RubricStep[] | null,
  apiKey: string
): Promise<ComparisonResult> {
  let rubricPrompt = '';
  if (rubricSteps && rubricSteps.length > 0) {
    rubricPrompt = `\n\nScore against these rubric criteria:\n`;
    rubricSteps.forEach((step, i) => {
      rubricPrompt += `${i + 1}. ${step.description} (${step.points} points max)\n`;
    });
  }

  const systemPrompt = `You are a precise and factual math grader comparing student work to a provided solution.

HALLUCINATION-SHIELD PROTOCOL:
1. GROUNDING: Base your comparison ONLY on what you can directly observe in BOTH images. Do NOT assume or infer.
2. ADMISSION OF UNCERTAINTY: If either image is unclear, state "CANNOT VERIFY: [what is unclear]". Do NOT guess.
3. SOURCE ATTRIBUTION: For every score decision, cite EXACT evidence: "Student wrote '[quote]' which matches/differs from solution step [X]"
4. NO CREATIVE INTERPRETATION: Compare ONLY visible work. Do NOT assume student "probably meant" something.
5. VERIFICATION: Before finalizing, verify each claim against visible content in both images.

Your task is to:
1. Perform OCR on both images to extract all text, equations, and mathematical expressions - QUOTE exactly what you see
2. Compare the student's work step-by-step against the correct solution - CITE specific matches/differences
3. Identify where the student's approach matches or differs from the solution - with exact quotes
4. Score each rubric criterion based on OBSERVABLE alignment with the solution
5. Identify specific misconceptions - ONLY if clearly evidenced in the visible work
6. Provide constructive feedback for improvement based on observed differences

CRITICAL: If you cannot read or verify something in either image, say "UNCLEAR" rather than assuming.`;

  const userPrompt = `Compare the student's work (first image) against the correct solution (second image).
${rubricPrompt}

Provide your analysis in this exact JSON format:
{
  "suggested_scores": [
    {"criterion": "criterion text", "score": 0, "max_score": 0, "feedback": "specific feedback"}
  ],
  "total_earned": 0,
  "total_possible": 0,
  "misconceptions": ["list of identified errors or misconceptions"],
  "feedback": "overall constructive feedback for the student",
  "correctness_analysis": "detailed comparison of student work vs solution"
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: [
        { type: 'text', text: userPrompt },
        formatImageForLovableAI(studentImageBase64),
        formatImageForLovableAI(solutionImageBase64),
      ]
    }
  ];

  const content = await callLovableAI(messages, apiKey);
  
  console.log('Comparison raw response:', content);

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const suggestedScores = (parsed.suggested_scores || []).map((s: any) => ({
        criterion: s.criterion || '',
        score: Number(s.score) || 0,
        maxScore: Number(s.max_score) || 0,
        feedback: s.feedback || '',
      }));

      const earned = Number(parsed.total_earned) || suggestedScores.reduce((sum: number, s: any) => sum + s.score, 0);
      const possible = Number(parsed.total_possible) || suggestedScores.reduce((sum: number, s: any) => sum + s.maxScore, 0);
      const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;

      return {
        suggestedScores,
        totalScore: { earned, possible, percentage },
        misconceptions: parsed.misconceptions || [],
        feedback: parsed.feedback || '',
        correctnessAnalysis: parsed.correctness_analysis || '',
        rawComparison: content,
      };
    }
  } catch (e) {
    console.error('Failed to parse comparison response:', e);
  }

  return {
    suggestedScores: [],
    totalScore: { earned: 0, possible: 0, percentage: 0 },
    misconceptions: [],
    feedback: 'Unable to parse AI comparison. Please score manually.',
    correctnessAnalysis: content,
    rawComparison: content,
  };
}

// Detect if a page is a new paper (starts with question 1) or a continuation
interface PageTypeResult {
  isNewPaper: boolean;
  isContinuation: boolean;
  detectedQuestionNumbers: number[];
  firstQuestionNumber: number | null;
  confidence: 'high' | 'medium' | 'low';
  rawExtraction: string;
}

async function detectPageTypeFromImage(imageBase64: string, apiKey: string): Promise<PageTypeResult> {
  const prompt = `CRITICAL TASK: Analyze this image of student work to determine if this is a NEW PAPER (first page) or a CONTINUATION of a previous page.

STEP 1 - SCAN FOR NUMBERS: Look CAREFULLY at the entire page for ANY numbers that indicate question/problem ordering:
- Look for "1.", "2.", "3." etc. at the start of problems
- Look for "#1", "#2", "Q1", "Q2", "Problem 1", "Question 1", etc.
- Look for circled numbers, boxed numbers, or numbers in margins
- Look for numbers labeling different sections or parts (Part 1, Part A, Section 1)

STEP 2 - DETERMINE PAGE TYPE:
- If you see question/problem #1 ANYWHERE on the page → This is a NEW PAPER (the main/first page)
- If the LOWEST number you see is 2, 3, 4, 5, or higher → This is a CONTINUATION (back side or additional page)
- Numbers starting from 1 = NEW PAPER that should receive the main grade
- Numbers NOT starting from 1 = CONTINUATION of previous work, should be combined with previous page

STEP 3 - LOOK FOR OTHER INDICATORS:
- "Page 2", "Side B", "Back", "(continued)", "cont'd" → CONTINUATION
- "Page 1", "Front", "Name:", student info at top → NEW PAPER
- Fresh worksheet header, printed questions → NEW PAPER
- Continuation of handwritten work without question 1 → CONTINUATION

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "question_numbers_found": [1, 2, 3],
  "first_question_number": 1,
  "lowest_question_number": 1,
  "is_new_paper": true,
  "is_continuation": false,
  "page_indicators": ["Page 1", "Front", "Name line visible"],
  "confidence": "high",
  "reasoning": "Question 1 is visible at the top of the page"
}

ABSOLUTE RULES:
- If Question/Problem #1 is present → is_new_paper = true, is_continuation = false (THIS IS THE MAIN GRADEABLE PAGE)
- If lowest question number is 2 or higher → is_new_paper = false, is_continuation = true (combine with previous page)
- If no question numbers found at all, assume is_new_paper = true (benefit of doubt - grade as main page)
- Single student work ALWAYS starts from question 1 - if it doesn't, it's a continuation!`;

  const messages = [
    { role: 'system', content: 'You are an expert at analyzing scanned student worksheets to identify question numbering patterns.' },
    { 
      role: 'user', 
      content: [
        { type: 'text', text: prompt },
        formatImageForLovableAI(imageBase64),
      ]
    }
  ];

  const content = await callLovableAI(messages, apiKey, 'detect-page-type');
  console.log('Page type detection response:', content);

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const questionNumbers = (parsed.question_numbers_found || []).map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0);
      
      // Get the lowest question number - this is KEY for determining page type
      const lowestNum = parsed.lowest_question_number 
        ? Number(parsed.lowest_question_number) 
        : (questionNumbers.length > 0 ? Math.min(...questionNumbers) : null);
      
      // CRITICAL LOGIC: If lowest number is 1 = new paper, if > 1 = continuation
      // Single student work starts from 1. If not starting from 1, it's a continuation.
      const hasQuestion1 = questionNumbers.includes(1) || lowestNum === 1;
      const startsFromHigherNumber = lowestNum !== null && lowestNum > 1;
      
      // Explicit detection based on lowest question number
      let isNewPaper: boolean;
      let isContinuation: boolean;
      
      if (startsFromHigherNumber) {
        // If lowest visible question is 2, 3, 4, etc. - this is definitely a continuation
        isNewPaper = false;
        isContinuation = true;
        console.log(`Page detected as CONTINUATION: lowest question number is ${lowestNum}`);
      } else if (hasQuestion1) {
        // If question 1 is visible - this is the main paper
        isNewPaper = true;
        isContinuation = false;
        console.log('Page detected as NEW PAPER: question 1 is visible');
      } else {
        // No question numbers found - default to AI's guess or assume new paper
        isNewPaper = parsed.is_new_paper ?? true;
        isContinuation = parsed.is_continuation ?? false;
        console.log('Page type uncertain, no clear question numbers - defaulting to new paper');
      }
      
      return {
        isNewPaper,
        isContinuation,
        detectedQuestionNumbers: questionNumbers.sort((a: number, b: number) => a - b),
        firstQuestionNumber: lowestNum,
        confidence: parsed.confidence || 'medium',
        rawExtraction: content,
      };
    }
  } catch (e) {
    console.error('Failed to parse page type response:', e);
  }

  // Default: assume new paper (benefit of doubt - grade it)
  return {
    isNewPaper: true,
    isContinuation: false,
    detectedQuestionNumbers: [],
    firstQuestionNumber: null,
    confidence: 'low',
    rawExtraction: content,
  };
}

interface StudentRosterItem {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface IdentificationResult {
  qrCodeDetected: boolean;
  qrCodeContent: string | null;
  parsedQRCode: { studentId: string; questionId?: string; version?: number } | null;
  handwrittenName: string | null;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedQuestionId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  rawExtraction: string;
}

async function identifyStudent(
  imageBase64: string, 
  studentRoster: StudentRosterItem[] | null,
  apiKey: string
): Promise<IdentificationResult> {
  const rosterInfo = studentRoster && studentRoster.length > 0
    ? `\n\nStudent Roster to match against:\n${studentRoster.map(s => 
        `- ${s.first_name} ${s.last_name}${s.student_id ? ` (ID: ${s.student_id})` : ''}`
      ).join('\n')}`
    : '';

const prompt = `Analyze this image of student work to identify the student. CRITICAL: Look carefully for QR codes!

1. QR CODE: Check ALL corners and edges thoroughly for any QR code. Scan the ENTIRE image carefully.
   - QR codes are typically small black-and-white square patterns, often in corners
   - VERSION 1 FORMAT: {"v":1,"s":"student-uuid","q":"question-uuid"} - contains student AND question IDs
   - VERSION 2 FORMAT: {"v":2,"type":"student","s":"student-uuid"} - contains ONLY student ID
   - If you find a QR code, extract its EXACT content character-by-character
   - The "s" field contains the student UUID that MUST match the roster
   
2. HANDWRITTEN NAME: Look for a handwritten student name, typically at the top of the page.
3. STUDENT ID: Look for any printed or handwritten student ID number.
${rosterInfo}

IMPORTANT MATCHING RULES:
- If you find a QR code with an "s" field, that UUID must EXACTLY match an "id" from the roster
- The roster IDs are UUIDs like "a1b2c3d4-e5f6-..." - match against these, NOT student_id numbers
- QR code match = "high" confidence always

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "qr_code_detected": true/false,
  "qr_code_content": "exact JSON content if found or null",
  "qr_code_version": 1 or 2 or null,
  "handwritten_name": "extracted name or null",
  "student_id_found": "ID if found or null",
  "matched_student_id": "roster UUID if matched or null",
  "matched_student_name": "full name if matched or null",
  "confidence": "high/medium/low/none",
  "notes": "any relevant observations"
}`;

  const messages = [
    { 
      role: 'user', 
      content: [
        { type: 'text', text: prompt },
        formatImageForLovableAI(imageBase64),
      ]
    }
  ];

  try {
    const content = await callLovableAI(messages, apiKey);
    
    console.log('Identification raw response:', content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      let parsedQRCode: { studentId: string; questionId?: string; version: number } | null = null;
      let matchedId = parsed.matched_student_id;
      let matchedName = parsed.matched_student_name;
      let matchedQuestionId: string | null = null;
      
      if (parsed.qr_code_content) {
        try {
          const qrData = JSON.parse(parsed.qr_code_content);
          
          // Version 1: Student + Question QR code
          if (qrData.v === 1 && qrData.s && qrData.q) {
            parsedQRCode = {
              studentId: qrData.s,
              questionId: qrData.q,
              version: 1,
            };
            matchedId = qrData.s;
            matchedQuestionId = qrData.q;
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedName = `${student.first_name} ${student.last_name}`;
              }
            }
            
            console.log('Parsed v1 QR code (student+question):', parsedQRCode);
          }
          // Version 2: Student-only QR code
          else if (qrData.v === 2 && qrData.type === 'student' && qrData.s) {
            parsedQRCode = {
              studentId: qrData.s,
              version: 2,
            };
            matchedId = qrData.s;
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedName = `${student.first_name} ${student.last_name}`;
              }
            }
            
            console.log('Parsed v2 QR code (student-only):', parsedQRCode);
          }
          // Fallback: Try to extract student ID from any "s" field
          else if (qrData.s) {
            parsedQRCode = {
              studentId: qrData.s,
              questionId: qrData.q,
              version: qrData.v || 0,
            };
            matchedId = qrData.s;
            if (qrData.q) matchedQuestionId = qrData.q;
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedName = `${student.first_name} ${student.last_name}`;
              }
            }
            
            console.log('Parsed generic QR code with student ID:', parsedQRCode);
          }
        } catch (qrParseError) {
          console.log('QR content is not structured JSON, using raw content:', parsed.qr_code_content);
        }
      }
      
      if (!matchedId && parsed.handwritten_name && studentRoster && studentRoster.length > 0) {
        const match = fuzzyMatchStudent(parsed.handwritten_name, studentRoster);
        if (match) {
          matchedId = match.id;
          matchedName = `${match.first_name} ${match.last_name}`;
        }
      }
      
      return {
        qrCodeDetected: parsed.qr_code_detected || false,
        qrCodeContent: parsed.qr_code_content || null,
        parsedQRCode,
        handwrittenName: parsed.handwritten_name || null,
        matchedStudentId: matchedId || null,
        matchedStudentName: matchedName || null,
        matchedQuestionId,
        confidence: parsedQRCode ? 'high' : (parsed.confidence || 'none'),
        rawExtraction: content,
      };
    }
  } catch (e) {
    console.error('Failed to parse identification response:', e);
  }

  return {
    qrCodeDetected: false,
    qrCodeContent: null,
    parsedQRCode: null,
    handwrittenName: null,
    matchedStudentId: null,
    matchedStudentName: null,
    matchedQuestionId: null,
    confidence: 'none',
    rawExtraction: 'Failed to identify student',
  };
}

function fuzzyMatchStudent(name: string, roster: StudentRosterItem[]): StudentRosterItem | null {
  const normalizedInput = name.toLowerCase().trim();
  
  for (const student of roster) {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const reverseName = `${student.last_name} ${student.first_name}`.toLowerCase();
    
    if (fullName === normalizedInput || reverseName === normalizedInput) {
      return student;
    }
  }
  
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    const lastName = student.last_name.toLowerCase();
    
    if (normalizedInput.includes(firstName) && normalizedInput.includes(lastName)) {
      return student;
    }
    
    if (normalizedInput === lastName || normalizedInput.endsWith(lastName)) {
      return student;
    }
  }
  
  let bestMatch: StudentRosterItem | null = null;
  let bestScore = 0;
  
  for (const student of roster) {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const score = calculateSimilarity(normalizedInput, fullName);
    
    if (score > bestScore && score > 0.6) {
      bestScore = score;
      bestMatch = student;
    }
  }
  
  return bestMatch;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

interface ParsedResult {
  ocrText: string;
  problemIdentified: string;
  nysStandard: string;
  conceptsDemonstrated: string[];
  coherentWorkShown: boolean;
  approachAnalysis: string;
  rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  regentsScore: number;
  regentsScoreJustification: string;
  grade: number;
  gradeJustification: string;
  feedback: string;
}

function parseAnalysisResult(text: string, rubricSteps?: any[], gradeFloor: number = 55, gradeFloorWithEffort: number = 65): ParsedResult {
  const result: ParsedResult = {
    ocrText: '',
    problemIdentified: '',
    nysStandard: '',
    conceptsDemonstrated: [],
    coherentWorkShown: false,
    approachAnalysis: '',
    rubricScores: [],
    misconceptions: [],
    totalScore: { earned: 0, possible: 0, percentage: 0 },
    regentsScore: 0,
    regentsScoreJustification: '',
    grade: gradeFloorWithEffort, // Default to effort floor - most scans have SOME work
    gradeJustification: '',
    feedback: '',
  };

  const ocrMatch = text.match(/OCR Text[:\s]*([^]*?)(?=Problem Identified|NYS Standard|Concepts Demonstrated|Approach Analysis|$)/i);
  if (ocrMatch) result.ocrText = ocrMatch[1].trim();

  const problemMatch = text.match(/Problem Identified[:\s]*([^]*?)(?=NYS Standard|Concepts Demonstrated|Approach Analysis|Rubric Scores|$)/i);
  if (problemMatch) result.problemIdentified = problemMatch[1].trim();

  // Parse NYS Standard
  const standardMatch = text.match(/NYS Standard[:\s]*([^]*?)(?=Correct Solution|Concepts Demonstrated|Approach Analysis|$)/i);
  if (standardMatch) result.nysStandard = standardMatch[1].trim();

  // Parse Concepts Demonstrated - KEY for concept-based grading
  const conceptsMatch = text.match(/Concepts Demonstrated[:\s]*([^]*?)(?=Coherent Work|Approach Analysis|Is Correct|$)/i);
  if (conceptsMatch) {
    const conceptsText = conceptsMatch[1].trim();
    result.conceptsDemonstrated = conceptsText
      .split(/[-•\n,;]/)
      .map(c => c.trim())
      .filter(c => c.length > 2 && !c.match(/^(none|n\/a|no concepts?)$/i));
  }

  // Parse Coherent Work Shown
  const coherentMatch = text.match(/Coherent Work Shown[:\s]*(YES|NO)/i);
  result.coherentWorkShown = coherentMatch ? coherentMatch[1].toUpperCase() === 'YES' : false;

  const approachMatch = text.match(/Approach Analysis[:\s]*([^]*?)(?=Is Correct|Regents Score|Rubric Scores|Misconceptions|$)/i);
  if (approachMatch) result.approachAnalysis = approachMatch[1].trim();

  // Parse Regents Score (0-4)
  const regentsScoreMatch = text.match(/Regents Score[:\s]*(\d)/i);
  if (regentsScoreMatch) {
    result.regentsScore = Math.min(4, Math.max(0, parseInt(regentsScoreMatch[1])));
  }

  const regentsJustificationMatch = text.match(/Regents Score Justification[:\s]*([^]*?)(?=Rubric Scores|Misconceptions|$)/i);
  if (regentsJustificationMatch) result.regentsScoreJustification = regentsJustificationMatch[1].trim();

  const misconceptionsMatch = text.match(/Misconceptions[:\s]*([^]*?)(?=Total Score|Standards Met|Feedback|$)/i);
  if (misconceptionsMatch) {
    const misconceptionsText = misconceptionsMatch[1].trim();
    result.misconceptions = misconceptionsText
      .split(/[-•\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0 && !m.match(/^(none|n\/a)$/i));
  }

  const scoreMatch = text.match(/Total Score[:\s]*(\d+(?:\.\d+)?)\s*[\/\\]\s*(\d+)/i);
  if (scoreMatch) {
    result.totalScore.earned = parseFloat(scoreMatch[1]);
    result.totalScore.possible = parseFloat(scoreMatch[2]);
    result.totalScore.percentage = result.totalScore.possible > 0 
      ? Math.round((result.totalScore.earned / result.totalScore.possible) * 100) 
      : 0;
  }

  // Parse grade justification EARLY so it's available for mastery detection
  const justificationMatch = text.match(/Grade Justification[:\s]*([^]*?)(?=Feedback|$)/i);
  if (justificationMatch) result.gradeJustification = justificationMatch[1].trim();

  // Parse grade (55-100 scale) based on CONCEPT UNDERSTANDING
  const gradeMatch = text.match(/Grade[:\s]*(\d+)/i);
  const standardsMetMatch = text.match(/Standards Met[:\s]*(YES|NO)/i);
  const standardsMet = standardsMetMatch ? standardsMetMatch[1].toUpperCase() === 'YES' : true;
  
  // CONCEPT-BASED UNDERSTANDING CHECK
  // Look for ANY evidence of understanding - this is the KEY determination
  const textLower = text.toLowerCase();
  
  // Check if EXPLICITLY marked as blank/no work
  const explicitlyBlank = (textLower.includes('blank response') || 
                          textLower.includes('completely blank') ||
                          textLower.includes('completely empty') ||
                          textLower.includes('nothing written') ||
                          textLower.includes('no response')) &&
                          !textLower.includes('some') &&
                          !textLower.includes('attempt');
  
  // Check for ANY understanding indicators
  const hasConceptsDemo = result.conceptsDemonstrated.length > 0;
  const hasCoherentWork = result.coherentWorkShown;
  const hasOcrContent = result.ocrText.trim().length > 10;
  const hasPositiveRegents = result.regentsScore >= 1;
  const hasPositiveScore = result.totalScore.earned > 0;
  
  // Look for understanding keywords in the analysis
  const showsUnderstanding = textLower.includes('understand') ||
                             textLower.includes('demonstrates') ||
                             textLower.includes('shows') ||
                             textLower.includes('attempt') ||
                             textLower.includes('tried') ||
                             textLower.includes('effort') ||
                             textLower.includes('basic') ||
                             textLower.includes('some') ||
                             textLower.includes('partial') ||
                             textLower.includes('limited') ||
                             textLower.includes('correct') ||
                             textLower.includes('concept');
  
  // *** CRITICAL: Check for FULL MASTERY / PERFECT SCORE indicators ***
  // If the justification says the student met full standards, got everything correct, etc. -> 100
  const fullMasteryIndicators = [
    'complete and correct',
    'complete mastery',
    'full mastery',
    'all concepts',
    'all problems correct',
    'complete understanding',
    'complete solutions',
    'correct solutions for all',
    'no discernible error',
    'no errors',
    'no computational error',
    'no conceptual error',
    'highest standards',
    'meeting the highest',
    'meets the highest',
    'exceeding standards',
    'exceeds standards',
    'perfect score',
    'perfectly correct',
    'all correct',
    'fully correct',
    'accurately understanding',
    'complete and accurate',
    'well-organized',
    'correctly applied formulas',
    'correctly executed',
    'proficiency in',
    'demonstrates proficiency',
  ];
  
  const hasPerfectIndicators = fullMasteryIndicators.some(indicator => textLower.includes(indicator));
  
  // Check the grade justification and regents justification specifically for mastery signals
  const justificationText = (result.gradeJustification + ' ' + result.regentsScoreJustification).toLowerCase();
  const justificationHasMastery = fullMasteryIndicators.some(indicator => justificationText.includes(indicator));
  
  // If justification explicitly says student met full standards / complete correct work -> override to 100
  const shouldGetPerfectScore = hasPerfectIndicators || justificationHasMastery;
  
  console.log(`Grade determination - Concepts: ${result.conceptsDemonstrated.length}, Coherent: ${hasCoherentWork}, Understanding: ${showsUnderstanding}, Blank: ${explicitlyBlank}, PerfectIndicators: ${shouldGetPerfectScore}`);
  
  // CRITICAL: If ANY understanding is shown, minimum is 65
  // Only give 55 if COMPLETELY blank with NO understanding whatsoever
  const hasAnyUnderstanding = !explicitlyBlank && (
    hasConceptsDemo ||
    hasCoherentWork ||
    hasOcrContent ||
    hasPositiveRegents ||
    hasPositiveScore ||
    showsUnderstanding ||
    standardsMet
  );
  
  // *** PERFECT SCORE OVERRIDE: If analysis indicates full mastery, give 100 ***
  if (shouldGetPerfectScore && hasAnyUnderstanding) {
    result.grade = 100;
    console.log('Full mastery detected in analysis - assigning grade 100');
  } else if (gradeMatch) {
    const parsedGrade = parseInt(gradeMatch[1]);
    // CRITICAL: If ANY understanding, minimum is 65
    if (hasAnyUnderstanding) {
      // Student shows understanding - enforce minimum of 65
      result.grade = Math.max(gradeFloorWithEffort, Math.min(100, parsedGrade));
    } else if (parsedGrade < gradeFloor) {
      // No understanding AND grade below floor - apply absolute minimum
      result.grade = gradeFloor;
    } else {
      result.grade = Math.min(100, parsedGrade);
    }
  } else if (result.regentsScore >= 0) {
    // Convert Regents score to grade based on concept understanding
    // More concepts = higher in the range
    const conceptBonus = Math.min(result.conceptsDemonstrated.length * 2, 5);
    
    const regentsToGrade: Record<number, number> = {
      4: 95,  // Full mastery
      3: 85,  // Strong understanding
      2: 75,  // Partial understanding
      1: gradeFloorWithEffort + 2,  // Basic understanding - slightly above floor
      0: hasAnyUnderstanding ? gradeFloorWithEffort : gradeFloor,  // Understanding gets floor, blank gets minimum
    };
    result.grade = Math.min(100, (regentsToGrade[result.regentsScore] ?? gradeFloorWithEffort) + conceptBonus);
  } else if (result.totalScore.percentage > 0) {
    // Fallback: convert percentage but ensure minimum based on understanding
    const scaledGrade = Math.round(gradeFloorWithEffort + (result.totalScore.percentage / 100) * (100 - gradeFloorWithEffort));
    result.grade = hasAnyUnderstanding ? Math.max(gradeFloorWithEffort, scaledGrade) : Math.max(gradeFloor, scaledGrade);
  } else if (hasAnyUnderstanding) {
    // Has understanding but no score parsed - default to effort floor
    result.grade = gradeFloorWithEffort;
  }

  // FINAL SAFEGUARD: Absolute enforcement of grade floors based on understanding
  // Perfect score override takes priority
  if (shouldGetPerfectScore && hasAnyUnderstanding) {
    result.grade = 100;
  } else if (hasAnyUnderstanding) {
    result.grade = Math.max(gradeFloorWithEffort, result.grade);
  }
  result.grade = Math.max(gradeFloor, result.grade);
  
  console.log(`Final grade: ${result.grade} (Understanding: ${hasAnyUnderstanding}, Perfect: ${shouldGetPerfectScore})`);

  // Grade justification already parsed above for mastery detection

  const feedbackMatch = text.match(/Feedback[:\s]*([^]*?)$/i);
  if (feedbackMatch) result.feedback = feedbackMatch[1].trim();

  if (rubricSteps && rubricSteps.length > 0) {
    const rubricSection = text.match(/Rubric Scores[:\s]*([^]*?)(?=Misconceptions|Total Score|Regents Score|$)/i);
    if (rubricSection) {
      rubricSteps.forEach((step, i) => {
        const criterionRegex = new RegExp(`(?:${i + 1}[.)]|${step.description.slice(0, 20)})[^\\d]*(\\d+(?:\\.\\d+)?)[\\s\\/]*(\\d+)?`, 'i');
        const match = rubricSection[1].match(criterionRegex);
        
        result.rubricScores.push({
          criterion: step.description,
          score: match ? parseFloat(match[1]) : 0,
          maxScore: step.points,
          feedback: '',
        });
      });
    }
  }

  return result;
}
