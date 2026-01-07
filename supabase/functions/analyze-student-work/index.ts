import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call Google Gemini API
async function callGeminiAPI(contents: any[], apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please try again in a moment." };
    }
    if (response.status === 403) {
      throw { status: 403, message: "Invalid API key or API not enabled. Check your Google Cloud console." };
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Helper to format image for Gemini
function formatImageForGemini(imageBase64: string) {
  // Remove data URL prefix if present
  let base64Data = imageBase64;
  let mimeType = "image/jpeg";
  
  if (imageBase64.startsWith('data:')) {
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }
  
  return {
    inline_data: {
      mime_type: mimeType,
      data: base64Data,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const { imageBase64, solutionBase64, questionId, rubricSteps, identifyOnly, studentRoster, studentName, teacherId, assessmentMode, promptText, compareMode } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    // Initialize Supabase client for sending notifications
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // If identifyOnly is true, just extract student identification info
    if (identifyOnly) {
      console.log('Identifying student from image...');
      const identification = await identifyStudent(imageBase64, studentRoster, GOOGLE_GEMINI_API_KEY);
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
      const comparison = await compareWithSolution(imageBase64, solutionBase64, rubricSteps, GOOGLE_GEMINI_API_KEY);
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
    
    let systemPrompt: string;
    let userPrompt: string;

    if (isAIMode) {
      // AI-assessed mode: AI solves the problem independently and checks student work
      systemPrompt = `You are an expert math teacher and grader. Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions
2. Identify the mathematical problem the student is solving
3. SOLVE THE PROBLEM YOURSELF to determine the correct answer and approach
4. Compare the student's work against the correct solution
5. Determine if the student's answer is mathematically correct
6. Identify any misconceptions or errors in the student's reasoning
7. If rubric criteria are provided, score each step
8. Provide constructive feedback

Be accurate, fair, and educational in your assessment. The key is to independently verify correctness.`;

      userPrompt = `Please analyze this student's handwritten math work.

IMPORTANT: You must solve this problem yourself first to determine the correct answer, then evaluate the student's work.`;

      if (promptText) {
        userPrompt += `\n\nThe problem statement is: ${promptText}`;
      }

      userPrompt += `

Steps to follow:
1. Extract all text and mathematical content from the image (OCR)
2. Identify the problem being solved
3. Solve the problem yourself to get the correct answer
4. Compare the student's solution to your solution
5. Determine if the student's final answer is correct`;

    } else {
      // Teacher-uploaded mode: Compare against provided answer key
      systemPrompt = `You are an expert math teacher and grader. Your task is to:
1. Perform OCR on the student's handwritten work to extract all text, equations, and mathematical expressions
2. Analyze the student's problem-solving approach and methodology
3. If rubric criteria are provided, score each step
4. Identify any misconceptions or errors in the student's reasoning
5. Provide constructive feedback

Be accurate, fair, and educational in your assessment.`;

      userPrompt = `Please analyze this student's handwritten math work.

Extract all text and mathematical content you can see (OCR).
Identify the problem being solved and evaluate the student's approach.`;
    }

    if (rubricSteps && rubricSteps.length > 0) {
      userPrompt += `\n\nScore against these rubric criteria:\n`;
      rubricSteps.forEach((step: { step_number: number; description: string; points: number }, i: number) => {
        userPrompt += `${i + 1}. ${step.description} (${step.points} points)\n`;
      });
    }

    userPrompt += `\n\nProvide your analysis in the following structure:
- OCR Text: (extracted handwritten content)
- Problem Identified: (what problem the student is solving)${isAIMode ? '\n- Correct Solution: (your solution to the problem)' : ''}
- Approach Analysis: (evaluation of their method)
- Is Correct: (YES or NO - is the final answer mathematically correct?)
- Rubric Scores: (if rubric provided, score each criterion)
- Misconceptions: (any errors or misunderstandings identified)
- Total Score: (points earned / total possible)
- Feedback: (constructive suggestions for improvement)`;

    // Build Gemini request
    const contents = [
      {
        role: "user",
        parts: [
          { text: `${systemPrompt}\n\n${userPrompt}` },
          formatImageForGemini(imageBase64),
        ]
      }
    ];

    const analysisText = await callGeminiAPI(contents, GOOGLE_GEMINI_API_KEY);

    if (!analysisText) {
      throw new Error('No analysis returned from AI');
    }

    console.log('Analysis complete');

    // Parse the structured response
    const result = parseAnalysisResult(analysisText, rubricSteps);

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
        // Don't fail the whole request if notification fails
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
    
    // Handle specific error statuses
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (error.status === 403) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
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

  const contents = [
    {
      role: "user",
      parts: [
        { text: `${systemPrompt}\n\n${userPrompt}` },
        formatImageForGemini(studentImageBase64),
        formatImageForGemini(solutionImageBase64),
      ]
    }
  ];

  const content = await callGeminiAPI(contents, apiKey);
  
  console.log('Comparison raw response:', content);

  try {
    // Extract JSON from response
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

  // Return empty result if parsing fails
  return {
    suggestedScores: [],
    totalScore: { earned: 0, possible: 0, percentage: 0 },
    misconceptions: [],
    feedback: 'Unable to parse AI comparison. Please score manually.',
    correctnessAnalysis: content,
    rawComparison: content,
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

  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        formatImageForGemini(imageBase64),
      ]
    }
  ];

  try {
    const content = await callGeminiAPI(contents, apiKey);
    
    console.log('Identification raw response:', content);

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Try to parse structured QR code format
      let parsedQRCode: { studentId: string; questionId: string } | null = null;
      let matchedId = parsed.matched_student_id;
      let matchedName = parsed.matched_student_name;
      let matchedQuestionId: string | null = null;
      
      if (parsed.qr_code_content) {
        try {
          const qrData = JSON.parse(parsed.qr_code_content);
          // Check for our structured format: {v: 1, s: studentId, q: questionId}
          if (qrData.v === 1 && qrData.s && qrData.q) {
            parsedQRCode = {
              studentId: qrData.s,
              questionId: qrData.q,
            };
            // Use QR code data for matching - high confidence
            matchedId = qrData.s;
            matchedQuestionId = qrData.q;
            
            // Find student name from roster using QR student ID
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
      
      // If we have a roster but no match yet, try fuzzy matching on the handwritten name
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
  
  // Try exact match first
  for (const student of roster) {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const reverseName = `${student.last_name} ${student.first_name}`.toLowerCase();
    
    if (fullName === normalizedInput || reverseName === normalizedInput) {
      return student;
    }
  }
  
  // Try partial matching
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    const lastName = student.last_name.toLowerCase();
    
    // Check if input contains both first and last name
    if (normalizedInput.includes(firstName) && normalizedInput.includes(lastName)) {
      return student;
    }
    
    // Check if last name matches (common for handwritten papers)
    if (normalizedInput === lastName || normalizedInput.endsWith(lastName)) {
      return student;
    }
  }
  
  // Try similarity scoring
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
  approachAnalysis: string;
  rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  feedback: string;
}

function parseAnalysisResult(text: string, rubricSteps?: any[]): ParsedResult {
  const result: ParsedResult = {
    ocrText: '',
    problemIdentified: '',
    approachAnalysis: '',
    rubricScores: [],
    misconceptions: [],
    totalScore: { earned: 0, possible: 0, percentage: 0 },
    feedback: '',
  };

  // Extract sections using regex patterns
  const ocrMatch = text.match(/OCR Text[:\s]*([^]*?)(?=Problem Identified|Approach Analysis|$)/i);
  if (ocrMatch) result.ocrText = ocrMatch[1].trim();

  const problemMatch = text.match(/Problem Identified[:\s]*([^]*?)(?=Approach Analysis|Rubric Scores|$)/i);
  if (problemMatch) result.problemIdentified = problemMatch[1].trim();

  const approachMatch = text.match(/Approach Analysis[:\s]*([^]*?)(?=Rubric Scores|Misconceptions|$)/i);
  if (approachMatch) result.approachAnalysis = approachMatch[1].trim();

  const misconceptionsMatch = text.match(/Misconceptions[:\s]*([^]*?)(?=Total Score|Feedback|$)/i);
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

  const feedbackMatch = text.match(/Feedback[:\s]*([^]*?)$/i);
  if (feedbackMatch) result.feedback = feedbackMatch[1].trim();

  if (rubricSteps && rubricSteps.length > 0) {
    const rubricSection = text.match(/Rubric Scores[:\s]*([^]*?)(?=Misconceptions|Total Score|$)/i);
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
