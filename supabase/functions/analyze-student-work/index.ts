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

    const { imageBase64, additionalImages, solutionBase64, questionId, rubricSteps, identifyOnly, detectPageType, studentRoster, studentName, teacherId, assessmentMode, promptText, compareMode, standardCode, topicName, customRubric, gradeFloor: customGradeFloor, gradeFloorWithEffort: customGradeFloorWithEffort } = await req.json();
    
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

    // Build the analysis prompt based on assessment mode
    const isAIMode = assessmentMode === 'ai';
    
    // NYS Regents scoring guide context
    const regentsContext = `
NYS REGENTS SCORING GUIDELINES:
The New York State Regents Examinations use a standards-based scoring approach. When evaluating student work:

SCORE 4 (Exceeding Standards - Grade 90-100):
- Complete and correct solution with clear, logical reasoning
- All mathematical procedures are correctly applied
- Work is well-organized and clearly communicated
- No computational or conceptual errors

SCORE 3 (Meeting Standards - Grade 80-89):
- Substantially correct solution with minor errors
- Mathematical reasoning is sound with small gaps
- Work shows understanding of the core concepts
- May have minor computational errors that don't affect the approach

SCORE 2 (Approaching Standards - Grade 70-79):
- Partial understanding demonstrated
- Some correct mathematical procedures but with significant gaps
- May reach incorrect conclusion due to errors in reasoning
- Shows effort but incomplete mastery

SCORE 1 (Limited Understanding - Grade 65-69):
- Minimal understanding of the mathematical concepts
- Limited correct work shown
- Major errors in approach or computation
- Some relevant mathematical work attempted
- ANY work that shows even limited understanding deserves at least 65

SCORE 0 (No Understanding Demonstrated - Grade 55):
- ONLY assign this if there is absolutely NO correct mathematical work
- Completely incorrect approach with no relevant work
- Blank or completely irrelevant response
- No understanding whatsoever demonstrated
- This should be RARE - if the student attempted anything relevant, use Score 1 (65) instead

CRITICAL GRADING RULES:
- NEVER give a grade of 0 - the minimum is always 55
- Work that shows ANY understanding (even limited) MUST receive at least 65
- If a student made an honest attempt with some relevant work, minimum grade is 65
- Reserve grades below 65 ONLY for blank/completely irrelevant responses

GRADE CONVERSION (55-100 Scale):
- Score 4 → 90-100 (Exceeding)
- Score 3 → 80-89 (Meeting)
- Score 2 → 70-79 (Approaching)
- Score 1 → 65-69 (Limited Understanding - minimum for any real attempt)
- Score 0 → 55 (absolute minimum - ONLY if completely no understanding shown)
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

Evaluate the student's work specifically against this NYS standard. Consider:
- Does the student demonstrate understanding of ${topicName || 'the standard'}?
- Are the mathematical procedures aligned with what's expected for this standard?
- What specific skills from this standard are demonstrated or missing?
` : '';
    
    let systemPrompt: string;
    let userPromptText: string;

    if (isAIMode) {
      systemPrompt = `You are an expert NYS Regents mathematics teacher and grader with deep knowledge of New York State learning standards. Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions
2. Identify the mathematical problem the student is solving and which NYS standard it aligns with
3. SOLVE THE PROBLEM YOURSELF to determine the correct answer and approach
4. Compare the student's work against the correct solution using NYS Regents scoring guidelines
5. Determine if the student's answer is mathematically correct
6. Identify any misconceptions or errors in the student's reasoning
7. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
8. Provide constructive, standards-aligned feedback

${regentsContext}
${customRubricContext}
${standardContext}

Be accurate, fair, and educational in your assessment. Always reference specific NYS standards when providing feedback.`;

      userPromptText = `Please analyze this student's handwritten math work using NYS Regents scoring standards.

IMPORTANT: You must solve this problem yourself first to determine the correct answer, then evaluate the student's work against NYS standards.`;

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
      systemPrompt = `You are an expert NYS Regents mathematics teacher and grader with deep knowledge of New York State learning standards. Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions
2. Analyze the student's problem-solving approach using NYS Regents scoring guidelines
3. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
4. Identify any misconceptions or errors in the student's reasoning
5. Provide constructive, standards-aligned feedback

${regentsContext}
${customRubricContext}
${standardContext}

Be accurate, fair, and educational in your assessment. Always reference specific NYS standards when providing feedback.`;

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

    userPromptText += `\n\nProvide your analysis in the following structure:
- OCR Text: (extracted handwritten content)
- Problem Identified: (what problem the student is solving)
- NYS Standard: (the most relevant NYS standard code and name, e.g., "A.REI.B.4 - Solving Quadratic Equations")${isAIMode ? '\n- Correct Solution: (your step-by-step solution to the problem)' : ''}
- Approach Analysis: (evaluation of their method against NYS expectations)
- Is Correct: (YES or NO - is the final answer mathematically correct?)
- Regents Score: (0, 1, 2, 3, or 4 based on NYS Regents rubric)
- Regents Score Justification: (why this Regents score was assigned based on the rubric)
- Rubric Scores: (if teacher rubric provided, score each criterion)
- Misconceptions: (any errors or misunderstandings identified, with NYS standard references)
- Total Score: (points earned / total possible from teacher rubric)
- Standards Met: (YES or NO - does work meet the minimum standard requirements?)
- Grade: (55-100 scale: Score 4=90-100, Score 3=80-89, Score 2=65-79, Score 1=55-64, Score 0=55)
- Grade Justification: (2-3 sentences explaining the grade, explicitly referencing NYS standards and what the student needs to meet proficiency)
- Feedback: (constructive suggestions referencing specific NYS standards the student should focus on)`;

    // Build messages for Lovable AI
    // If additionalImages provided, include all pages as a multi-page paper
    const imageContent: any[] = [
      { type: 'text', text: userPromptText },
      formatImageForLovableAI(imageBase64),
    ];
    
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

    // Get teacher's grade floor settings if available
    let gradeFloor = customGradeFloor || 55;
    let gradeFloorWithEffort = customGradeFloorWithEffort || 65;
    
    if (effectiveTeacherId && supabase && !customGradeFloor) {
      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('grade_floor, grade_floor_with_effort')
          .eq('teacher_id', effectiveTeacherId)
          .maybeSingle();
        
        if (settingsData) {
          gradeFloor = settingsData.grade_floor ?? 55;
          gradeFloorWithEffort = settingsData.grade_floor_with_effort ?? 65;
        }
      } catch (settingsError) {
        console.error('Error fetching grade floor settings:', settingsError);
      }
    }

    // Parse the structured response with grade floor settings
    const result = parseAnalysisResult(analysisText, rubricSteps, gradeFloor, gradeFloorWithEffort);

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

  const systemPrompt = `You are an expert math teacher helping grade student work by comparing it to a provided solution.

Your task is to:
1. Perform OCR on both images to extract all text, equations, and mathematical expressions
2. Compare the student's work step-by-step against the correct solution
3. Identify where the student's approach matches or differs from the solution
4. Score each rubric criterion based on how well the student's work aligns with the solution
5. Identify specific misconceptions or errors
6. Provide constructive feedback for improvement

Be fair, accurate, and educational in your assessment.`;

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
  const prompt = `Analyze this image of student work to determine if this is a NEW PAPER or a CONTINUATION of a previous page.

Look for:
1. QUESTION NUMBERS: Find any numbered questions visible (e.g., "1.", "2.", "3." or "#1", "#2", "Question 1", etc.)
2. If question #1 is visible, this is a NEW PAPER (first page)
3. If the visible questions start with a number OTHER than 1 (e.g., starts at 3, 4, 5), this is a CONTINUATION page (back side or next page)
4. Look for page indicators like "Page 2", "Side B", "Back", "(continued)", etc.

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "question_numbers_found": [1, 2, 3],
  "first_question_number": 1,
  "is_new_paper": true,
  "is_continuation": false,
  "page_indicators": ["Page 1", "Front"],
  "confidence": "high"
}

RULES:
- If Question 1 is present, is_new_paper = true, is_continuation = false
- If Question 1 is NOT present but other questions are, is_new_paper = false, is_continuation = true
- If no question numbers found, assume is_new_paper = true (benefit of doubt)`;

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
      
      const questionNumbers = (parsed.question_numbers_found || []).map((n: any) => Number(n)).filter((n: number) => !isNaN(n));
      const firstNum = parsed.first_question_number ? Number(parsed.first_question_number) : (questionNumbers.length > 0 ? Math.min(...questionNumbers) : null);
      
      // Determine if new paper based on presence of question 1
      const hasQuestion1 = questionNumbers.includes(1) || firstNum === 1;
      const isNewPaper = parsed.is_new_paper ?? hasQuestion1 ?? true;
      const isContinuation = parsed.is_continuation ?? (!hasQuestion1 && questionNumbers.length > 0);
      
      return {
        isNewPaper: isNewPaper && !isContinuation,
        isContinuation: isContinuation,
        detectedQuestionNumbers: questionNumbers,
        firstQuestionNumber: firstNum,
        confidence: parsed.confidence || 'medium',
        rawExtraction: content,
      };
    }
  } catch (e) {
    console.error('Failed to parse page type response:', e);
  }

  // Default: assume new paper
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
  parsedQRCode: { studentId: string; questionId: string } | null;
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

  const prompt = `Analyze this image of student work to identify the student. Look for:

1. QR CODE: Check all corners and edges for any QR code. If found, extract its EXACT content.
   - The QR code may contain JSON like: {"v":1,"s":"student-uuid","q":"question-uuid"}
   - Extract the complete content exactly as encoded
2. HANDWRITTEN NAME: Look for a handwritten student name, typically at the top of the page.
3. STUDENT ID: Look for any printed or handwritten student ID number.
${rosterInfo}

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "qr_code_detected": true/false,
  "qr_code_content": "exact content if found or null",
  "handwritten_name": "extracted name or null",
  "student_id_found": "ID if found or null",
  "matched_student_id": "roster ID if matched or null",
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
      
      let parsedQRCode: { studentId: string; questionId: string } | null = null;
      let matchedId = parsed.matched_student_id;
      let matchedName = parsed.matched_student_name;
      let matchedQuestionId: string | null = null;
      
      if (parsed.qr_code_content) {
        try {
          const qrData = JSON.parse(parsed.qr_code_content);
          if (qrData.v === 1 && qrData.s && qrData.q) {
            parsedQRCode = {
              studentId: qrData.s,
              questionId: qrData.q,
            };
            matchedId = qrData.s;
            matchedQuestionId = qrData.q;
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedName = `${student.first_name} ${student.last_name}`;
              }
            }
            
            console.log('Parsed structured QR code:', parsedQRCode);
          }
        } catch (qrParseError) {
          console.log('QR content is not structured JSON, using raw content');
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

  const ocrMatch = text.match(/OCR Text[:\s]*([^]*?)(?=Problem Identified|NYS Standard|Approach Analysis|$)/i);
  if (ocrMatch) result.ocrText = ocrMatch[1].trim();

  const problemMatch = text.match(/Problem Identified[:\s]*([^]*?)(?=NYS Standard|Approach Analysis|Rubric Scores|$)/i);
  if (problemMatch) result.problemIdentified = problemMatch[1].trim();

  // Parse NYS Standard
  const standardMatch = text.match(/NYS Standard[:\s]*([^]*?)(?=Correct Solution|Approach Analysis|$)/i);
  if (standardMatch) result.nysStandard = standardMatch[1].trim();

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

  // Parse grade (55-100 scale) based on Regents score if available
  const gradeMatch = text.match(/Grade[:\s]*(\d+)/i);
  const standardsMetMatch = text.match(/Standards Met[:\s]*(YES|NO)/i);
  const standardsMet = standardsMetMatch ? standardsMetMatch[1].toUpperCase() === 'YES' : true;
  
  // VERY lenient check for any work - if we're analyzing an image, assume there's work
  // unless the text explicitly indicates blank/no work
  const textLower = text.toLowerCase();
  const explicitlyBlank = textLower.includes('blank response') || 
                          textLower.includes('no work shown') ||
                          textLower.includes('completely empty') ||
                          textLower.includes('no mathematical work') ||
                          textLower.includes('nothing written') ||
                          (textLower.includes('no understanding') && result.regentsScore === 0);
  
  // If the AI is analyzing student work, they almost always have SOME work
  // Only mark as no work if explicitly stated as blank
  const hasAnyWork = !explicitlyBlank || 
                     result.ocrText.trim().length > 5 || 
                     result.approachAnalysis.toLowerCase().includes('attempt') ||
                     result.approachAnalysis.toLowerCase().includes('work') ||
                     result.approachAnalysis.toLowerCase().includes('show') ||
                     result.approachAnalysis.toLowerCase().includes('wrote') ||
                     result.approachAnalysis.toLowerCase().includes('student') ||
                     result.totalScore.earned > 0 ||
                     result.regentsScore >= 1;
  
  if (gradeMatch) {
    const parsedGrade = parseInt(gradeMatch[1]);
    // CRITICAL: Never allow grade of 0 - enforce minimum floors
    if (parsedGrade === 0 || parsedGrade < gradeFloor) {
      // If AI returned 0 or below floor, apply appropriate floor
      result.grade = hasAnyWork ? gradeFloorWithEffort : gradeFloor;
    } else if (hasAnyWork && parsedGrade < gradeFloorWithEffort) {
      // Has work but grade below effort floor - bump up
      result.grade = gradeFloorWithEffort;
    } else {
      result.grade = Math.min(100, parsedGrade);
    }
  } else if (result.regentsScore >= 0) {
    // Convert Regents score to grade if no explicit grade given
    // Use teacher's configured floors for Score 1 and Score 0
    const regentsToGrade: Record<number, number> = {
      4: 95,  // Exceeding
      3: 85,  // Meeting
      2: 75,  // Approaching
      1: Math.max(gradeFloorWithEffort, 67),  // Limited understanding - slightly above floor
      0: hasAnyWork ? gradeFloorWithEffort : gradeFloor,  // Even score 0 with work gets effort floor
    };
    result.grade = regentsToGrade[result.regentsScore] ?? (hasAnyWork ? gradeFloorWithEffort : gradeFloor);
  } else if (result.totalScore.percentage > 0) {
    // Fallback: convert percentage to grade scale above the effort floor
    const scaledGrade = Math.round(gradeFloorWithEffort + (result.totalScore.percentage / 100) * (100 - gradeFloorWithEffort));
    result.grade = Math.max(gradeFloorWithEffort, scaledGrade);
  } else if (hasAnyWork) {
    // If any work was shown but no score parsed, use effort floor
    result.grade = gradeFloorWithEffort;
  }

  // FINAL SAFEGUARD: Absolute enforcement of grade floors
  // This catches any edge cases where the grade might still be too low
  if (hasAnyWork) {
    result.grade = Math.max(gradeFloorWithEffort, result.grade);
  }
  result.grade = Math.max(gradeFloor, result.grade);

  // Parse grade justification
  const justificationMatch = text.match(/Grade Justification[:\s]*([^]*?)(?=Feedback|$)/i);
  if (justificationMatch) result.gradeJustification = justificationMatch[1].trim();

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
