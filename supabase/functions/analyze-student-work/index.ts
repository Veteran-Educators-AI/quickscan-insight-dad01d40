import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI MODEL CONFIGURATION — DIRECT OPENAI API
// ═══════════════════════════════════════════════════════════════════════════════
type AnalysisProvider = 'gemini' | 'gpt4o' | 'gpt4o-mini';

function getAnalysisModel(_provider: AnalysisProvider): string {
  // All providers now route to OpenAI directly
  return 'gpt-4o';
}

const LITE_MODEL = 'gpt-4o-mini';
type AIModelTier = 'lite' | 'standard';

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING & USAGE LOGGING (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
async function checkRateLimit(supabase: any, userId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_ai_rate_limit', { p_user_id: userId });
    
    // If RPC fails (e.g. function missing), allow request
    if (error) { 
      console.warn('Rate limit check error (allowing request):', error.message); 
      return { allowed: true }; 
    }

    if (!data.allowed) {
      // TEMPORARY BYPASS: Log warning but allow request
      console.warn(`[RATE LIMIT BYPASS] User ${userId} exceeded limit: ${data.hourly_limit}/hour. Allowing request.`);
      return { allowed: true };
      
      // Original blocking logic:
      // if (data.hourly_remaining === 0) return { allowed: false, message: `Hourly AI limit reached (${data.hourly_limit}/hour). Please wait.` };
      // if (data.daily_remaining === 0) return { allowed: false, message: `Daily AI limit reached (${data.daily_limit}/day). Resets in 24 hours.` };
    }
  } catch (err) {
    console.error('Rate limit exception:', err);
  }
  return { allowed: true };
}

async function logAIUsage(supabase: any, userId: string, functionName: string, usage: any, latencyMs: number) {
  const { error } = await supabase.from('ai_usage_logs').insert({
    user_id: userId, function_name: functionName,
    prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0, latency_ms: latencyMs,
  });
  if (error) console.error('Failed to log AI usage:', error);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPENAI API CALL — direct, no gateway
// ═══════════════════════════════════════════════════════════════════════════════
interface AICallOptions {
  temperature?: number;   // 0 = deterministic (default for grading), 0.3-0.7 = creative
  top_p?: number;         // 1 = consider all tokens (default)
  seed?: number;          // reproducibility seed (supported by some models)
  modelOverride?: string; // override model selection
}

async function callLovableAI(
  messages: any[], _apiKey: string, functionName = 'analyze-student-work',
  supabase?: any, userId?: string, modelTier: AIModelTier = 'lite',
  analysisProvider: AnalysisProvider = 'gpt4o',
  options: AICallOptions = {}
) {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('OPENAI_API_KEY is not configured');

  const model = options.modelOverride || (modelTier === 'standard' ? getAnalysisModel(analysisProvider) : LITE_MODEL);
  const maxTokens = modelTier === 'standard' ? 4000 : 2000;
  const startTime = Date.now();

  // DETERMINISTIC DEFAULTS: temperature=0, seed=42 for grading consistency
  const temperature = options.temperature ?? 0;
  const top_p = options.top_p ?? 1;
  const seed = options.seed ?? 42;

  console.log(`[AI_CALL] function=${functionName} model=${model} tier=${modelTier} temp=${temperature} seed=${seed}`);

  const requestBody = JSON.stringify({
    model,
    messages,
    max_completion_tokens: maxTokens,
    temperature,
    top_p,
    seed,
  });

  const MAX_RETRIES = 1;
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 3000 * attempt));
      console.log(`[AI_CALL] Retry ${attempt + 1}/${MAX_RETRIES + 1} for ${functionName}`);
    }
    try {
      const timeoutMs = modelTier === 'standard' ? 60000 : 45000;
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: requestBody, signal: controller.signal,
      });
      clearTimeout(tid);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI error (attempt ${attempt + 1}):`, response.status, errText);
        if (response.status === 429) throw { status: 429, message: "OpenAI rate limit exceeded. Please try again shortly." };
        if (response.status === 402) throw { status: 402, message: "OpenAI billing issue." };
        if (response.status === 401 || response.status === 403) throw new Error(`Auth error: ${response.status}`);
        if (response.status >= 500) { lastError = new Error(`Server error: ${response.status}`); continue; }
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      const usage = data.usage || {};
      console.log(`[TOKEN_USAGE] fn=${functionName} model=${model} prompt=${usage.prompt_tokens || 0} completion=${usage.completion_tokens || 0} latency=${latencyMs}ms`);

      if (supabase && userId) await logAIUsage(supabase, userId, functionName, usage, latencyMs);

      const content = data.choices?.[0]?.message?.content || '';
      if (!content && attempt < MAX_RETRIES) { lastError = new Error('Empty response'); continue; }
      return content;
    } catch (err: any) {
      if (err.name === 'AbortError') { lastError = new Error('Request timed out'); if (attempt < MAX_RETRIES) continue; }
      if (err.status === 429 || err.status === 402) throw err;
      lastError = err;
      if (attempt >= MAX_RETRIES) throw err;
    }
  }
  throw lastError || new Error(`AI call failed after ${MAX_RETRIES + 1} attempts`);
}

function formatImageForAI(imageBase64: string) {
  let dataUrl = imageBase64;
  if (!imageBase64.startsWith('data:')) dataUrl = `data:image/jpeg;base64,${imageBase64}`;
  return { type: 'image_url', image_url: { url: dataUrl } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLANK PAGE DETECTION — simple text-length check, no separate AI call
// ═══════════════════════════════════════════════════════════════════════════════
const BOILERPLATE_PATTERNS = [
  /^name\s*[:.]?\s*/gim, /^date\s*[:.]?\s*/gim, /^period\s*[:.]?\s*/gim,
  /^class\s*[:.]?\s*/gim, /^page\s*\d+/gim, /^side\s*[ab]/gim,
  /^#?\s*\d+\s*$/gm, /^question\s*\d*\s*[:.]?\s*$/gim,
  /^directions?\s*[:.]?\s*/gim, /^instructions?\s*[:.]?\s*/gim,
  /^show\s+your\s+work/gim, /^answer\s*[:.]?\s*$/gim,
  /^\s*[-–—_]{3,}\s*$/gm,
];

function isBlankPage(rawText: string | null | undefined, threshold = 20): boolean {
  if (!rawText || rawText.toUpperCase().includes('BLANK_PAGE')) return true;
  let text = rawText;
  for (const p of BOILERPLATE_PATTERNS) { p.lastIndex = 0; text = text.replace(p, ''); }
  return text.replace(/\s+/g, ' ').trim().length < threshold;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE TYPE DETECTION (kept lean)
// ═══════════════════════════════════════════════════════════════════════════════
async function detectPageTypeFromImage(imageBase64: string, apiKey: string) {
  const prompt = `Look at this student work image. Determine if it starts with question #1 (NEW PAPER) or a higher number (CONTINUATION).
Respond in JSON only:
{"question_numbers_found":[1,2],"lowest_question_number":1,"is_new_paper":true,"is_continuation":false,"confidence":"high"}`;

  const content = await callLovableAI([
    { role: 'system', content: 'You analyze scanned student worksheets. Respond in JSON only.' },
    { role: 'user', content: [{ type: 'text', text: prompt }, formatImageForAI(imageBase64)] }
  ], apiKey, 'detect-page-type', undefined, undefined, 'lite', 'gemini');

  try {
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const nums = (parsed.question_numbers_found || []).map(Number).filter((n: number) => n > 0);
    const lowest = parsed.lowest_question_number ? Number(parsed.lowest_question_number) : (nums.length ? Math.min(...nums) : null);
    const isNew = lowest === null || lowest <= 1;
    return {
      isNewPaper: isNew, isContinuation: !isNew,
      detectedQuestionNumbers: nums.sort((a: number, b: number) => a - b),
      firstQuestionNumber: lowest, confidence: parsed.confidence || 'medium', rawExtraction: content,
    };
  } catch { return { isNewPaper: true, isContinuation: false, detectedQuestionNumbers: [], firstQuestionNumber: null, confidence: 'low' as const, rawExtraction: content }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT IDENTIFICATION (kept, trimmed prompt)
// ═══════════════════════════════════════════════════════════════════════════════
async function identifyStudentViaOCR(imageBase64: string, studentRoster: any[] | null) {
  const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
  if (!GOOGLE_VISION_API_KEY) {
    console.error('[IDENTIFY] GOOGLE_VISION_API_KEY not configured, cannot identify student');
    return {
      qrCodeDetected: false, qrCodeContent: null, parsedQRCode: null,
      handwrittenName: null, matchedStudentId: null, matchedStudentName: null,
      matchedQuestionId: null, confidence: 'none' as const, rawExtraction: null,
    };
  }

  // Strip data URL prefix for Vision API
  let raw = imageBase64;
  if (raw.startsWith('data:')) {
    raw = raw.split(',')[1] || raw;
  }

  console.log('[IDENTIFY] Calling Google Vision OCR for student identification...');
  const startTime = Date.now();

  let ocrText = '';
  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: raw },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', model: 'builtin/latest' }],
            imageContext: { languageHints: ['en'] },
          }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[IDENTIFY] Vision API error: ${response.status}`, errText);
      throw new Error(`Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const annotations = data.responses?.[0];
    if (annotations?.error) {
      throw new Error(annotations.error.message || 'Vision API annotation error');
    }

    ocrText = annotations?.fullTextAnnotation?.text
      || annotations?.textAnnotations?.[0]?.description
      || '';
  } catch (err: any) {
    console.error('[IDENTIFY] Vision OCR failed:', err.message);
    return {
      qrCodeDetected: false, qrCodeContent: null, parsedQRCode: null,
      handwrittenName: null, matchedStudentId: null, matchedStudentName: null,
      matchedQuestionId: null, confidence: 'none' as const, rawExtraction: null,
    };
  }

  const latencyMs = Date.now() - startTime;
  console.log(`[IDENTIFY] OCR complete in ${latencyMs}ms, extracted ${ocrText.length} chars`);

  let qrCodeDetected = false;
  let qrCodeContent: string | null = null;
  let parsedQRCode: any = null;
  let matchedStudentId: string | null = null;
  let matchedStudentName: string | null = null;
  let matchedQuestionId: string | null = null;

  // 1. Search OCR text for QR code JSON patterns
  const qrPatterns = [
    /\{[^{}]*"v"\s*:\s*\d+[^{}]*"s"\s*:\s*"[^"]+"/g,
    /\{[^{}]*"s"\s*:\s*"[^"]+[^{}]*"v"\s*:\s*\d+/g,
  ];
  for (const pattern of qrPatterns) {
    const matches = ocrText.match(pattern);
    if (matches) {
      for (const m of matches) {
        try {
          // Try to complete the JSON if truncated
          let jsonStr = m;
          if (!jsonStr.endsWith('}')) {
            const closingIdx = ocrText.indexOf('}', ocrText.indexOf(m) + m.length);
            if (closingIdx !== -1) {
              jsonStr = ocrText.substring(ocrText.indexOf(m), closingIdx + 1);
            }
          }
          const qr = JSON.parse(jsonStr);
          if (qr.s) {
            qrCodeDetected = true;
            qrCodeContent = jsonStr;
            parsedQRCode = { studentId: qr.s, questionId: qr.q, version: qr.v || 0, pageNumber: qr.p, totalPages: qr.t };
            if (qr.q) matchedQuestionId = qr.q;
            // Verify against roster
            const student = studentRoster?.find(s => s.id === qr.s);
            if (student) {
              matchedStudentId = qr.s;
              matchedStudentName = `${student.first_name} ${student.last_name}`;
              console.log(`[IDENTIFY] QR code matched student: ${matchedStudentName}`);
            } else {
              console.log(`[IDENTIFY] QR code found but student ID ${qr.s} not in roster`);
              // Clear invalid QR match to allow name fallback
              parsedQRCode = null;
              qrCodeDetected = false;
              qrCodeContent = null;
            }
            break;
          }
        } catch { /* continue */ }
      }
      if (matchedStudentId) break;
    }
  }

  // 2. Name extraction from OCR text — use first few lines
  let handwrittenName: string | null = null;
  if (!matchedStudentId && studentRoster?.length) {
    const lines = ocrText.split('\n').slice(0, 10); // Focus on top of page
    // Clean boilerplate from each line
    const cleanedLines: string[] = [];
    for (const line of lines) {
      let cleaned = line.trim();
      if (!cleaned || cleaned.length < 2 || cleaned.length > 60) continue;
      // Skip obvious non-name lines
      if (/^\d+[\.\)]\s/.test(cleaned)) continue; // question numbers
      if (/^(directions?|instructions?|show\s+your\s+work|answer|page|side)/i.test(cleaned)) continue;
      // Extract name from "Name: ..." pattern
      const nameMatch = cleaned.match(/^(?:name|student|by|written by|from)\s*[:.\-]\s*(.+)/i);
      if (nameMatch) {
        cleaned = nameMatch[1].trim();
      }
      // Remove trailing date/period info
      cleaned = cleaned.replace(/\s*(period|class|date|pd|hr)[\s\d:./]*$/i, '').trim();
      if (cleaned.length >= 2) {
        cleanedLines.push(cleaned);
      }
    }

    // Try fuzzy matching each candidate line against roster
    for (const candidate of cleanedLines) {
      const match = fuzzyMatchStudent(candidate, studentRoster);
      if (match) {
        matchedStudentId = match.id;
        matchedStudentName = `${match.first_name} ${match.last_name}`;
        handwrittenName = candidate;
        console.log(`[IDENTIFY] Name matched: "${candidate}" → ${matchedStudentName}`);
        break;
      }
    }

    // If no match, store first plausible name candidate
    if (!handwrittenName && cleanedLines.length > 0) {
      // Pick the line most likely to be a name (2-4 words, alphabetic)
      for (const line of cleanedLines) {
        const words = line.split(/\s+/).filter(w => /^[a-zA-Z'-]+$/.test(w));
        if (words.length >= 1 && words.length <= 4) {
          handwrittenName = line;
          break;
        }
      }
    }
  }

  const confidence = matchedStudentId
    ? (parsedQRCode ? 'high' : 'medium')
    : (handwrittenName ? 'low' : 'none');

  console.log(`[IDENTIFY] Result: confidence=${confidence}, matched=${matchedStudentName || 'none'}, handwritten=${handwrittenName || 'none'}`);

  return {
    qrCodeDetected, qrCodeContent, parsedQRCode,
    handwrittenName,
    matchedStudentId, matchedStudentName,
    matchedQuestionId, confidence: confidence as 'high' | 'medium' | 'low' | 'none',
    rawExtraction: ocrText.substring(0, 500), // Truncate for response size
  };
}

function fuzzyMatchStudent(name: string, roster: any[]): any | null {
  const clean = name.toLowerCase().trim()
    .replace(/^(name|student|by|written by|from)[:\s]*/i, '')
    .replace(/\s*(period|class|date|pd)[\s\d:]*$/i, '').trim();

  for (const s of roster) {
    const full = `${s.first_name} ${s.last_name}`.toLowerCase();
    const rev = `${s.last_name} ${s.first_name}`.toLowerCase();
    if (full === clean || rev === clean) return s;
  }
  for (const s of roster) {
    const fn = s.first_name.toLowerCase();
    const ln = s.last_name.toLowerCase();
    if ((clean === fn && fn.length >= 3) || (clean === ln && ln.length >= 3)) return s;
    if (fn.length >= 2 && ln.length >= 2 && clean.includes(fn) && clean.includes(ln)) return s;
  }
  // Levenshtein fallback
  let best: any = null, bestScore = 0;
  for (const s of roster) {
    const full = `${s.first_name} ${s.last_name}`.toLowerCase();
    const score = similarity(clean, full);
    if (score > bestScore && score > 0.5) { bestScore = score; best = s; }
  }
  return best;
}

function similarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (!longer.length) return 1;
  const matrix: number[][] = Array.from({ length: shorter.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= longer.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= shorter.length; i++)
    for (let j = 1; j <= longer.length; j++)
      matrix[i][j] = shorter[i-1] === longer[j-1] ? matrix[i-1][j-1] : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
  return (longer.length - matrix[shorter.length][longer.length]) / longer.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLUTION COMPARISON (kept, trimmed prompt)
// ═══════════════════════════════════════════════════════════════════════════════
async function compareWithSolution(studentImg: string, solutionImg: string, rubricSteps: any[] | null, apiKey: string) {
  let rubricPrompt = '';
  if (rubricSteps?.length) {
    rubricPrompt = `\nScore against these criteria:\n${rubricSteps.map((s, i) => `${i+1}. ${s.description} (${s.points}pts)`).join('\n')}`;
  }
  const content = await callLovableAI([
    { role: 'system', content: 'You are a grader comparing student work to a solution. Base claims only on visible evidence. Respond in JSON.' },
    { role: 'user', content: [
      { type: 'text', text: `Compare student work (image 1) to correct solution (image 2).${rubricPrompt}\nJSON format: {"suggested_scores":[{"criterion":"...","score":0,"max_score":0,"feedback":"..."}],"total_earned":0,"total_possible":0,"misconceptions":["..."],"feedback":"...","correctness_analysis":"..."}` },
      formatImageForAI(studentImg), formatImageForAI(solutionImg),
    ] }
  ], apiKey, 'compare-with-solution', undefined, undefined, 'standard', 'gemini');

  try {
    const p = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const scores = (p.suggested_scores || []).map((s: any) => ({ criterion: s.criterion || '', score: +s.score || 0, maxScore: +s.max_score || 0, feedback: s.feedback || '' }));
    const earned = +p.total_earned || scores.reduce((s: number, x: any) => s + x.score, 0);
    const possible = +p.total_possible || scores.reduce((s: number, x: any) => s + x.maxScore, 0);
    return { suggestedScores: scores, totalScore: { earned, possible, percentage: possible > 0 ? Math.round(earned/possible*100) : 0 }, misconceptions: p.misconceptions || [], feedback: p.feedback || '', correctnessAnalysis: p.correctness_analysis || '', rawComparison: content };
  } catch {
    return { suggestedScores: [], totalScore: { earned: 0, possible: 0, percentage: 0 }, misconceptions: [], feedback: 'Could not parse AI comparison.', correctnessAnalysis: content, rawComparison: content };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GRADING PROMPT — CALIBRATION-ANCHORED, JSON OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════
function buildGradingPrompt(opts: {
  rubricSteps?: any[];
  standardCode?: string;
  topicName?: string;
  customRubric?: any;
  promptText?: string;
  answerGuideBase64?: string;
  gradingStyleContext: string;
  teacherAnswerSampleContext: string;
  verificationContext: string;
  feedbackVerbosity: string;
  gradeFloor: number;
  gradeFloorWithEffort: number;
}): { system: string; user: string } {

  const rubricSection = opts.rubricSteps?.length
    ? `\nSCORING RUBRIC (score each criterion separately):\n${opts.rubricSteps.map((s: any, i: number) => `  ${i+1}. "${s.description}" — ${s.points} points`).join('\n')}\nInclude rubric_scores array in your JSON with each criterion scored.`
    : '';

  const standardSection = opts.standardCode
    ? `\nSTANDARD: ${opts.standardCode}${opts.topicName ? ` — ${opts.topicName}` : ''}`
    : '';

  const customRubricSection = opts.customRubric
    ? `\nCUSTOM RUBRIC:\n${opts.customRubric.criteria.map((c: any, i: number) => `  ${i+1}. ${c.name} (${c.weight}%): ${c.description}`).join('\n')}`
    : '';

  const teacherGuideNote = opts.answerGuideBase64
    ? `\nIMPORTANT: A teacher answer guide image is attached. Use it as the PRIMARY grading reference. Compare the student's work directly against this guide.`
    : '';

  const detailLevel = opts.feedbackVerbosity === 'detailed'
    ? 'Write 150-200 word justification with specific quotes from student work. Write 100-150 word feedback.'
    : 'Write 75-120 word justification with specific quotes. Write 60-100 word feedback.';

  const system = `You are a calibrated NYS Regents grading engine. You produce consistent, evidence-based grades.

GRADING PROCEDURE (follow these steps IN ORDER):

STEP 1 — EXTRACT: Read ALL student handwriting from the entire page including margins. Record exact text.
STEP 2 — DETECT: Is there student handwriting? (Printed questions alone = NO student work)
STEP 3 — IDENTIFY: What problem/question is being answered? What subject area?
STEP 4 — EVALUATE: Check the final answer and work shown against the standard/rubric.
STEP 5 — SCORE using this STRICT decision tree (use the EXACT grade values shown):

  ┌─ PERFECT: Correct final answer + complete work shown ──► 97 (Regents 4)
  ├─ EXCELLENT: Correct answer + minor work omission ──────► 93 (Regents 4)
  ├─ GOOD: Correct answer + significant work gaps ─────────► 88 (Regents 3)
  ├─ ADEQUATE: Right approach, minor computational error ──► 83 (Regents 3)
  ├─ DEVELOPING: Some understanding, wrong final answer ───► 75 (Regents 2)
  ├─ MINIMAL: Confused attempt, little understanding ──────► ${opts.gradeFloorWithEffort} (Regents 1)
  └─ NO RESPONSE: Blank page / no student work ────────────► ${opts.gradeFloor} (Regents 0)

IMPORTANT: You MUST output one of these EXACT grade values: 97, 93, 88, 83, 75, ${opts.gradeFloorWithEffort}, or ${opts.gradeFloor}.
Do NOT interpolate or choose values between these anchors. Pick the anchor that best matches.

STEP 6 — VERIFY: Re-read your justification. Does it support your grade? If not, adjust.

CALIBRATION EXAMPLES (use these as scoring anchors):
• Student correctly solves "3x + 5 = 20" showing all steps "3x+5=20, 3x=15, x=5" → Grade: 97 (PERFECT)
• Student writes "3x = 15, x = 5" but skips showing subtraction of 5 → Grade: 93 (EXCELLENT)
• Student writes "x = 5" correct answer but shows no algebra work → Grade: 88 (GOOD)
• Student writes "3x = 25, x = 8.3" (wrong subtraction but right method) → Grade: 83 (ADEQUATE)
• Student writes "x = 25" wrong answer with confused attempt → Grade: 75 (DEVELOPING)
• Student writes "x = 7" with no work, wrong answer, no understanding → Grade: ${opts.gradeFloorWithEffort} (MINIMAL)
• Blank page → Grade: ${opts.gradeFloor} (NO RESPONSE)

CONSISTENCY RULES (MANDATORY):
1. CORRECT final answer = MINIMUM grade of 88. Never grade a correct answer below 88.
2. You MUST use one of the exact anchor values: 97, 93, 88, 83, 75, ${opts.gradeFloorWithEffort}, ${opts.gradeFloor}.
3. Quote the student's actual written work as evidence for EVERY claim.
4. If handwriting is hard to read, give your best interpretation and set confidence to "low".
5. Do NOT penalize for messy handwriting if the work is mathematically correct.
6. Be CONSISTENT: the same quality of work MUST receive the same grade every time.
7. When in doubt between two adjacent anchors, choose the HIGHER one.
${opts.gradingStyleContext}${opts.teacherAnswerSampleContext}${opts.verificationContext}${teacherGuideNote}${standardSection}${customRubricSection}`;

  const user = `Grade this student's work.${opts.promptText ? ` Problem: ${opts.promptText}` : ''}${rubricSection}

${detailLevel}

Respond with a SINGLE JSON object. No markdown, no code fences, no text outside the JSON:
{
  "ocr_text": "(all extracted handwritten text from the page)",
  "student_work_present": true,
  "detected_subject": "Math",
  "problem_identified": "(brief, under 20 words)",
  "nys_standard": "CODE - Description",
  "is_correct": true,
  "regents_score": 3,
  "regents_justification": "(why this Regents score)",
  "strengths": ["(specific thing done right, quoting student work)"],
  "areas_for_improvement": ["(specific error with why wrong and how to fix, quoting student work)"],
  "misconceptions": ["(verified errors only — quote exact student writing. Empty array if none)"],
  "grade": 85,
  "grade_justification": "(cite student's actual writing using 'Student wrote: ...' format)",
  "feedback": "(constructive: what was done well, what to practice, next steps)",
  "confidence": "high"${rubricSection ? ',\n  "rubric_scores": [{"criterion": "...", "score": 0, "max_score": 0, "feedback": "..."}]' : ''}
}`;

  return { system, user };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE VALIDATION — cross-checks grade against Regents band
// ═══════════════════════════════════════════════════════════════════════════════
function validateAndNormalizeGrade(
  rawGrade: number,
  regentsScore: number,
  isCorrect: boolean,
  hasMisconceptions: boolean,
  studentWorkPresent: boolean,
  gradeFloor: number,
  gradeFloorWithEffort: number
): { grade: number; regentsScore: number; adjusted: boolean; adjustReason: string } {
  let adjusted = false;
  let adjustReason = '';

  // BLANK PAGE → floor
  if (!studentWorkPresent) {
    return { grade: gradeFloor, regentsScore: 0, adjusted: rawGrade !== gradeFloor, adjustReason: 'Blank page → floor' };
  }

  let grade = Math.max(gradeFloorWithEffort, Math.min(100, rawGrade));

  // Correct answer → minimum 88 (anchored at GOOD tier)
  if (isCorrect && !hasMisconceptions) {
    if (grade < 88) {
      adjusted = true;
      adjustReason = `Correct answer boosted from ${grade} to 88`;
      grade = 88;
    }
    if (regentsScore < 3) regentsScore = 3;
  }

  // Cross-check: snap grade to nearest valid anchor value
  const GRADE_ANCHORS = [97, 93, 88, 83, 75, gradeFloorWithEffort, gradeFloor];
  const regentsBands: Record<number, [number, number]> = {
    4: [91, 100],   // anchors: 93, 97
    3: [81, 90],    // anchors: 83, 88
    2: [70, 80],    // anchor: 75
    1: [gradeFloorWithEffort, 69],  // anchor: gradeFloorWithEffort
    0: [gradeFloor, gradeFloor],
  };

  // Snap grade to nearest anchor value for consistency
  const nearestAnchor = GRADE_ANCHORS.reduce((prev, curr) =>
    Math.abs(curr - grade) < Math.abs(prev - grade) ? curr : prev
  );
  if (nearestAnchor !== grade) {
    adjusted = true;
    adjustReason += `${adjustReason ? '; ' : ''}Snapped grade ${grade} to nearest anchor ${nearestAnchor}`;
    grade = nearestAnchor;
  }

  // Verify grade falls within Regents band
  const band = regentsBands[regentsScore];
  if (band) {
    if (grade < band[0] || grade > band[1]) {
      // Grade outside band — find the nearest anchor WITHIN the band
      const validAnchors = GRADE_ANCHORS.filter(a => a >= band[0] && a <= band[1]);
      const bestAnchor = validAnchors.length > 0
        ? validAnchors.reduce((prev, curr) => Math.abs(curr - grade) < Math.abs(prev - grade) ? curr : prev)
        : Math.round((band[0] + band[1]) / 2);
      adjusted = true;
      adjustReason += `${adjustReason ? '; ' : ''}Grade ${grade} outside Regents ${regentsScore} band [${band[0]}-${band[1]}], snapped to anchor ${bestAnchor}`;
      grade = bestAnchor;
    }
  }

  // Derive Regents from grade if they're still misaligned
  const derivedRegents = grade >= 90 ? 4 : grade >= 80 ? 3 : grade >= 70 ? 2 : grade >= gradeFloorWithEffort ? 1 : 0;
  if (derivedRegents !== regentsScore) {
    regentsScore = derivedRegents;
  }

  grade = Math.min(100, Math.max(gradeFloor, grade));

  if (adjusted) {
    console.log(`[GRADE_GUARD] ${adjustReason}. Final: grade=${grade}, regents=${regentsScore}`);
  }

  return { grade, regentsScore, adjusted, adjustReason };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE AI RESPONSE — JSON-first with regex fallback
// ═══════════════════════════════════════════════════════════════════════════════
function parseAnalysisResult(text: string, rubricSteps?: any[], gradeFloor = 55, gradeFloorWithEffort = 65) {
  // ─── Try JSON parse first (primary path) ───
  let parsed: any = null;
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.warn('[PARSE] JSON parse failed, falling back to regex');
  }

  let ocrText: string;
  let studentWorkPresent: boolean;
  let detectedSubject: string;
  let problemIdentified: string;
  let nysStandard: string;
  let isAnswerCorrect: boolean;
  let regentsScore: number;
  let strengthsAnalysis: string[];
  let areasForImprovement: string[];
  let misconceptions: string[];
  let rawGrade: number;
  let gradeJustification: string;
  let feedback: string;
  let confidence: string;
  let rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[] = [];

  if (parsed && typeof parsed === 'object' && ('grade' in parsed || 'student_work_present' in parsed)) {
    // ─── PATH 1: JSON structured output ───
    console.log('[PARSE] Using JSON structured output');

    ocrText = parsed.ocr_text || '';
    studentWorkPresent = parsed.student_work_present !== false && parsed.student_work_present !== 'NO';
    detectedSubject = parsed.detected_subject || '';
    problemIdentified = parsed.problem_identified || '';
    nysStandard = parsed.nys_standard || '';
    isAnswerCorrect = parsed.is_correct === true || parsed.is_correct === 'YES';
    regentsScore = Math.min(4, Math.max(0, parseInt(parsed.regents_score) || 0));
    strengthsAnalysis = Array.isArray(parsed.strengths) ? parsed.strengths.filter((s: string) => s && s.length >= 10) : [];
    areasForImprovement = Array.isArray(parsed.areas_for_improvement) ? parsed.areas_for_improvement.filter((s: string) => s && s.length >= 10) : [];
    misconceptions = Array.isArray(parsed.misconceptions) ? parsed.misconceptions.filter((m: string) => m && m.length >= 5 && !/no error|no misconception|none|N\/A/i.test(m)) : [];
    rawGrade = parseInt(parsed.grade) || gradeFloorWithEffort;
    gradeJustification = parsed.grade_justification || parsed.regents_justification || '';
    feedback = parsed.feedback || '';
    confidence = parsed.confidence || 'medium';

    // Parse rubric scores from JSON
    if (Array.isArray(parsed.rubric_scores)) {
      rubricScores = parsed.rubric_scores.map((rs: any) => ({
        criterion: rs.criterion || '',
        score: parseFloat(rs.score) || 0,
        maxScore: parseFloat(rs.max_score) || 0,
        feedback: rs.feedback || '',
      }));
    }

    // Fill in missing rubric scores from rubricSteps
    if (rubricSteps?.length && rubricScores.length < rubricSteps.length) {
      rubricSteps.forEach((step: any, i: number) => {
        if (!rubricScores[i]) {
          rubricScores.push({ criterion: step.description, score: 0, maxScore: step.points, feedback: '' });
        }
      });
    }

  } else {
    // ─── PATH 2: Regex fallback (legacy) ───
    console.warn('[PARSE] Using regex fallback');

    const extract = (label: string, until: string) => {
      const re = new RegExp(`${label}[:\\s]*([\\s\\S]*?)(?=${until}|$)`, 'i');
      return re.exec(text)?.[1]?.trim() || '';
    };
    const extractList = (label: string, until: string) =>
      extract(label, until).split(/\n/).map(s => s.replace(/^[-•*✓]\s*/, '').trim()).filter(s => s.length >= 15);

    ocrText = extract('OCR Text', 'Student Work Present|Detected Subject|student_work_present');
    const workRaw = text.match(/Student Work Present[:\s]*(YES|NO)/i);
    studentWorkPresent = workRaw ? workRaw[1].toUpperCase() === 'YES' : ocrText.length > 30;
    detectedSubject = extract('Detected Subject', 'Problem Identified');
    problemIdentified = extract('Problem Identified', 'NYS Standard');
    nysStandard = extract('NYS Standard', 'Is Correct');
    const correctRaw = text.match(/Is Correct[:\s]*(YES|NO)/i);
    isAnswerCorrect = correctRaw ? correctRaw[1].toUpperCase() === 'YES' : false;

    const regentsMatch = text.match(/Regents Score(?!\s*Justification)[:\s]*(\d)/i);
    regentsScore = regentsMatch ? Math.min(4, Math.max(0, parseInt(regentsMatch[1]))) : -1;

    strengthsAnalysis = extractList('Strengths', 'Areas for Improvement|Misconceptions');
    areasForImprovement = extractList('Areas for Improvement', 'Misconceptions|Grade:');
    misconceptions = extractList('Misconceptions', 'Grade:|Grade Justification|Feedback');
    misconceptions = misconceptions.filter(m => !/no error|no misconception|none/i.test(m));

    const gradeMatch = text.match(/\bGrade[:\s]*(\d+)/i);
    rawGrade = gradeMatch ? parseInt(gradeMatch[1]) : (regentsScore >= 0 ? ({ 4: 95, 3: 85, 2: 75, 1: gradeFloorWithEffort, 0: gradeFloor } as Record<number, number>)[regentsScore] ?? gradeFloorWithEffort : gradeFloorWithEffort);
    gradeJustification = extract('Grade Justification', 'Feedback');
    feedback = extract('Feedback', 'Rubric Scores|$');
    confidence = 'medium';

    // Derive Regents if not parsed
    if (regentsScore < 0) {
      regentsScore = rawGrade >= 90 ? 4 : rawGrade >= 80 ? 3 : rawGrade >= 70 ? 2 : rawGrade >= gradeFloorWithEffort ? 1 : 0;
    }

    // Parse rubric scores from text
    if (rubricSteps?.length) {
      const rubricSection = extract('Rubric Scores', '$');
      rubricSteps.forEach((step: any, i: number) => {
        const re = new RegExp(`(?:${i+1}[.)]|${step.description.slice(0,20)})[^\\d]*(\\d+(?:\\.\\d+)?)[\\s/]*(\\d+)?`, 'i');
        const m = rubricSection.match(re);
        rubricScores.push({ criterion: step.description, score: m ? parseFloat(m[1]) : 0, maxScore: step.points, feedback: '' });
      });
    }
  }

  // ─── GRADE VALIDATION — cross-check grade against Regents band ───
  const hasMisconceptions = misconceptions.length > 0;
  const validated = validateAndNormalizeGrade(
    rawGrade, regentsScore, isAnswerCorrect, hasMisconceptions,
    studentWorkPresent, gradeFloor, gradeFloorWithEffort
  );

  const grade = validated.grade;
  regentsScore = validated.regentsScore;

  console.log(`[GRADING] raw=${rawGrade} → validated=${grade} regents=${regentsScore} correct=${isAnswerCorrect} misconceptions=${misconceptions.length} confidence=${confidence}${validated.adjusted ? ` ADJUSTED: ${validated.adjustReason}` : ''}`);

  // Total score (Regents 0-4 scale)
  const totalScore = { earned: regentsScore, possible: 4, percentage: Math.round(regentsScore / 4 * 100) };

  return {
    detectedSubject,
    ocrText,
    problemIdentified,
    nysStandard,
    conceptsDemonstrated: [] as string[],
    studentWorkPresent,
    coherentWorkShown: studentWorkPresent,
    approachAnalysis: '',
    strengthsAnalysis,
    areasForImprovement,
    whatStudentDidCorrectly: strengthsAnalysis.join(' '),
    whatStudentGotWrong: areasForImprovement.join(' '),
    rubricScores,
    misconceptions,
    totalScore,
    regentsScore,
    regentsScoreJustification: gradeJustification || `Regents Score ${regentsScore}/4 aligned with grade ${grade}.`,
    grade,
    gradeJustification: gradeJustification || `Grade: ${grade}. ${studentWorkPresent ? 'Based on demonstrated understanding.' : 'No student work present.'}`,
    feedback: feedback || (studentWorkPresent ? 'Review the marked strengths and areas for improvement.' : 'No student work was submitted on this page.'),
    isAnswerCorrect,
    finalAnswerComplete: true,
    confidence,
    gradeAdjusted: validated.adjusted,
    gradeAdjustReason: validated.adjustReason,
    ...(!studentWorkPresent && {
      noResponse: true,
      noResponseReason: 'TEXT_LENGTH' as const,
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN REQUEST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase config missing');

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user)
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const authenticatedUserId = user.id;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');

    // ── Parse request ──
    let requestBody;
    try { requestBody = await req.json(); } catch {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body. Image may be too large.', retryable: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const {
      imageBase64, additionalImages, solutionBase64, answerGuideBase64,
      questionId, rubricSteps, identifyOnly, detectPageType, studentRoster,
      studentName, teacherId, assessmentMode, promptText, compareMode,
      standardCode, topicName, customRubric,
      gradeFloor: customGradeFloor, gradeFloorWithEffort: customGradeFloorWithEffort,
      useLearnedStyle, blankPageSettings,
      preExtractedOCR,
    } = requestBody;

    const effectiveTeacherId = teacherId || authenticatedUserId;
    if (!imageBase64 && !preExtractedOCR) throw new Error('Image data or OCR text is required');

    // ── Page type detection ──
    if (detectPageType) {
      const pageType = await detectPageTypeFromImage(imageBase64, OPENAI_API_KEY);
      return new Response(JSON.stringify({ success: true, pageType }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Service role client for DB operations ──
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

    // ── Rate limit removed — using direct OpenAI API which has its own limits ──

    // ── Identify only (single) ──
    if (identifyOnly && !requestBody.batchIdentify) {
      const identification = await identifyStudentViaOCR(imageBase64, studentRoster);
      return new Response(JSON.stringify({ success: true, identification }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Batch identify (multiple images, parallel OCR) ──
    if (requestBody.batchIdentify && Array.isArray(requestBody.images)) {
      const images: { id: string; imageBase64: string }[] = requestBody.images;
      console.log(`[BATCH_IDENTIFY] Processing ${images.length} images in parallel`);
      const startTime = Date.now();

      const results = await Promise.all(
        images.map(async (img) => {
          try {
            const identification = await identifyStudentViaOCR(img.imageBase64, studentRoster);
            return { id: img.id, success: true, identification };
          } catch (err: any) {
            console.error(`[BATCH_IDENTIFY] Failed for ${img.id}:`, err.message);
            return {
              id: img.id, success: false,
              identification: {
                qrCodeDetected: false, qrCodeContent: null, parsedQRCode: null,
                handwrittenName: null, matchedStudentId: null, matchedStudentName: null,
                matchedQuestionId: null, confidence: 'none' as const, rawExtraction: null,
              },
            };
          }
        })
      );

      const latencyMs = Date.now() - startTime;
      const matched = results.filter(r => r.identification.matchedStudentId).length;
      console.log(`[BATCH_IDENTIFY] Complete: ${matched}/${images.length} matched in ${latencyMs}ms`);

      return new Response(
        JSON.stringify({ success: true, results, latencyMs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Compare mode ──
    if (compareMode && solutionBase64) {
      const comparison = await compareWithSolution(imageBase64, solutionBase64, rubricSteps, OPENAI_API_KEY);
      return new Response(JSON.stringify({ success: true, comparison }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Fetch teacher settings ──
    let feedbackVerbosity = 'concise';
    let gradeFloor = customGradeFloor || 55;
    let gradeFloorWithEffort = customGradeFloorWithEffort || 65;
    let aiTrainingMode = 'learning';
    let analysisProvider: AnalysisProvider = 'gemini';

    if (effectiveTeacherId && supabase) {
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('grade_floor, grade_floor_with_effort, ai_feedback_verbosity, ai_training_mode, analysis_provider')
          .eq('teacher_id', effectiveTeacherId)
          .maybeSingle();
        if (settings) {
          if (!customGradeFloor) { gradeFloor = settings.grade_floor ?? 55; gradeFloorWithEffort = settings.grade_floor_with_effort ?? 65; }
          feedbackVerbosity = settings.ai_feedback_verbosity ?? 'concise';
          aiTrainingMode = settings.ai_training_mode ?? 'learning';
          if (['gpt4o', 'gpt4o-mini', 'gemini'].includes(settings.analysis_provider)) analysisProvider = settings.analysis_provider;
        }
      } catch (e) { console.error('Settings fetch error:', e); }
    }

    // ── Fetch grading style context (teacher corrections) ──
    let gradingStyleContext = '';
    if (supabase && effectiveTeacherId && (useLearnedStyle || aiTrainingMode !== 'off')) {
      try {
        const { data: corrections } = await supabase
          .from('grading_corrections')
          .select('ai_grade, corrected_grade, correction_reason, strictness_indicator')
          .eq('teacher_id', effectiveTeacherId)
          .order('created_at', { ascending: false }).limit(15);
        if (corrections?.length) {
          const avgDiff = corrections.reduce((s: number, c: any) => s + (c.corrected_grade - c.ai_grade), 0) / corrections.length;
          const examples = corrections.slice(0, 3).map((c: any) =>
            `AI:${c.ai_grade}→Teacher:${c.corrected_grade}${c.correction_reason ? ` (${c.correction_reason})` : ''}`
          ).join('; ');
          gradingStyleContext = `\nTeacher grading style (${corrections.length} corrections): avg adjustment ${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(1)}. Examples: ${examples}. ${avgDiff > 3 ? 'Be more generous.' : avgDiff < -3 ? 'Be stricter.' : ''}`;
        }
      } catch (e) { console.error('Corrections fetch error:', e); }
    }

    // ── Fetch teacher answer samples ──
    let teacherAnswerSampleContext = '';
    if (supabase && effectiveTeacherId && topicName) {
      try {
        const { data: samples } = await supabase
          .from('teacher_answer_samples')
          .select('topic_name, grading_emphasis, key_steps')
          .eq('teacher_id', effectiveTeacherId)
          .or(`topic_name.ilike.%${topicName}%,nys_standard.ilike.%${standardCode || ''}%`)
          .order('created_at', { ascending: false }).limit(2);
        if (samples?.length) {
          teacherAnswerSampleContext = `\nTeacher's approach for ${topicName}: ${samples.map((s: any) =>
            `${s.grading_emphasis || ''}${s.key_steps?.length ? ` Key steps: ${s.key_steps.join(', ')}` : ''}`
          ).join('; ')}. Grade based on alignment with teacher's method.`;
        }
      } catch (e) { console.error('Samples fetch error:', e); }
    }

    // ── Fetch verification patterns ──
    let verificationContext = '';
    if (supabase && effectiveTeacherId) {
      try {
        const { data: verifs } = await supabase
          .from('interpretation_verifications')
          .select('interpretation, decision, correct_interpretation')
          .eq('teacher_id', effectiveTeacherId)
          .order('created_at', { ascending: false }).limit(20);
        if (verifs?.length) {
          const rejected = verifs.filter((v: any) => v.decision === 'rejected' && v.correct_interpretation).slice(0, 5);
          if (rejected.length) {
            verificationContext = `\nPast corrections: ${rejected.map((v: any) => `"${v.interpretation}"→"${v.correct_interpretation}"`).join('; ')}`;
          }
        }
      } catch (e) { console.error('Verification fetch error:', e); }
    }

    // ── Context fingerprint for debugging prompt drift ──
    const contextHash = [gradingStyleContext, teacherAnswerSampleContext, verificationContext]
      .map(s => s.length).join('-');
    console.log(`[CONTEXT_FINGERPRINT] hash=${contextHash} style_len=${gradingStyleContext.length} samples_len=${teacherAnswerSampleContext.length} verif_len=${verificationContext.length}`);

    // ── BLANK PAGE EARLY EXIT — no separate AI call needed ──

    // ── OCR-ASSISTED GRADING (unified through callLovableAI) ──
    if (preExtractedOCR && typeof preExtractedOCR === 'string' && preExtractedOCR.length > 0) {
      console.log(`[OCR_ASSISTED] Grading from pre-extracted OCR (${preExtractedOCR.length} chars) + image`);

      const { system: sysPrompt, user: usrPrompt } = buildGradingPrompt({
        rubricSteps, standardCode, topicName, customRubric, promptText,
        answerGuideBase64: answerGuideBase64 ? 'yes' : undefined,
        gradingStyleContext, teacherAnswerSampleContext, verificationContext,
        feedbackVerbosity, gradeFloor, gradeFloorWithEffort,
      });

      // Include OCR text in the prompt so AI doesn't need to re-read handwriting
      const ocrAugmentedPrompt = `${usrPrompt}\n\n--- STUDENT'S EXTRACTED WORK (from OCR) ---\n${preExtractedOCR}\n--- END OF STUDENT WORK ---\nThe student's image is also attached for visual context (diagrams, graphs, formatting). Use the OCR text as the primary source for reading handwriting.`;

      const userContent: any[] = [
        { type: 'text', text: ocrAugmentedPrompt },
      ];

      if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 50) {
        userContent.push(formatImageForAI(imageBase64));
      }

      if (answerGuideBase64) {
        userContent.push({ type: 'text', text: '[TEACHER ANSWER GUIDE:]' });
        userContent.push(formatImageForAI(answerGuideBase64));
      }

      // Use callLovableAI for unified temp=0, seed=42, retry logic, and logging
      const analysisText = await callLovableAI(
        [{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }],
        OPENAI_API_KEY, 'analyze-student-work-ocr', supabase, effectiveTeacherId,
        'standard', analysisProvider,
        { temperature: 0, seed: 42 }
      );

      if (!analysisText) throw new Error('No analysis returned from AI');

      const result = parseAnalysisResult(analysisText, rubricSteps, gradeFloor, gradeFloorWithEffort);

      // Override OCR text with the pre-extracted version (more reliable)
      result.ocrText = preExtractedOCR;

      // Handle blank page
      if (!result.studentWorkPresent && blankPageSettings?.enabled) {
        const blankScore = blankPageSettings.score ?? gradeFloor;
        result.grade = blankScore;
        result.gradeJustification = blankPageSettings.comment ?? 'No work shown; score assigned per no-response policy.';
        result.feedback = 'No student work detected. Re-scan with better lighting if incorrect.';
      }

      return new Response(JSON.stringify({
        success: true,
        analysis: result,
        rawAnalysis: analysisText,
        blankPageDetected: !result.studentWorkPresent,
        ocrSource: 'google-vision-assisted',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Build prompt ──
    const { system: systemPrompt, user: userPromptText } = buildGradingPrompt({
      rubricSteps, standardCode, topicName, customRubric, promptText,
      answerGuideBase64: answerGuideBase64 ? 'yes' : undefined,
      gradingStyleContext, teacherAnswerSampleContext, verificationContext,
      feedbackVerbosity, gradeFloor, gradeFloorWithEffort,
    });

    // ── Build message with images ──
    const imageContent: any[] = [
      { type: 'text', text: userPromptText },
      formatImageForAI(imageBase64),
    ];
    if (answerGuideBase64) {
      imageContent.push({ type: 'text', text: '[TEACHER ANSWER GUIDE:]' });
      imageContent.push(formatImageForAI(answerGuideBase64));
    }
    if (additionalImages?.length) {
      imageContent.push({ type: 'text', text: '[CONTINUATION PAGES:]' });
      for (const img of additionalImages) imageContent.push(formatImageForAI(img));
    }

    // ── Call AI with consensus grading for maximum consistency ──
    console.log(`Grading with provider=${analysisProvider}, model=${getAnalysisModel(analysisProvider)}`);
    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: imageContent }];

    // CONSENSUS GRADING: Call AI 3 times with different seeds, take median grade
    const CONSENSUS_ROUNDS = 3;
    const CONSENSUS_SEEDS = [42, 123, 256];
    const consensusResults: { grade: number; result: any; analysisText: string }[] = [];

    for (let round = 0; round < CONSENSUS_ROUNDS; round++) {
      console.log(`[CONSENSUS] Round ${round + 1}/${CONSENSUS_ROUNDS} seed=${CONSENSUS_SEEDS[round]}`);
      const roundText = await callLovableAI(
        messages as any,
        OPENAI_API_KEY, 'analyze-student-work', supabase, effectiveTeacherId,
        'standard', analysisProvider,
        { temperature: 0, seed: CONSENSUS_SEEDS[round] }
      );
      if (!roundText) continue;
      const roundResult = parseAnalysisResult(roundText, rubricSteps, gradeFloor, gradeFloorWithEffort);
      consensusResults.push({ grade: roundResult.grade, result: roundResult, analysisText: roundText });
    }

    if (consensusResults.length === 0) throw new Error('No analysis returned from AI');

    // Sort by grade and pick the median
    consensusResults.sort((a, b) => a.grade - b.grade);
    const medianIdx = Math.floor(consensusResults.length / 2);
    const chosen = consensusResults[medianIdx];
    const analysisText = chosen.analysisText;
    const result = chosen.result;

    // Log consensus spread
    const grades = consensusResults.map(r => r.grade);
    const spread = Math.max(...grades) - Math.min(...grades);
    console.log(`[CONSENSUS] grades=[${grades.join(',')}] median=${chosen.grade} spread=${spread}`);
    result.consensusGrades = grades;
    result.consensusSpread = spread;



    // ── Handle blank page from grading result ──
    if (!result.studentWorkPresent && blankPageSettings?.enabled) {
      const blankScore = blankPageSettings.score ?? gradeFloor;
      const blankComment = blankPageSettings.comment ?? 'No work shown on this page; score assigned per no-response policy.';
      result.grade = blankScore;
      result.gradeJustification = blankComment;
      result.feedback = 'This page has no student work. If incorrect, re-scan with better lighting.';
      console.log(`Blank page detected in grading — score set to ${blankScore}`);
    }

    // ── Push notification ──
    if (teacherId && supabase) {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: teacherId,
            title: studentName ? `${studentName}'s work analyzed` : 'Student work analyzed',
            body: `Grade: ${result.grade}%`,
            data: { url: '/scan' },
          },
        });
      } catch (e) { console.error('Push notification failed:', e); }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: result,
      rawAnalysis: analysisText,
      blankPageDetected: !result.studentWorkPresent,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in analyze-student-work:', error);
    let message = error?.message || 'Unknown error';
    if (message.includes('timed out')) message = 'Analysis timed out. Try again or reduce image size.';
    else if (message.includes('fetch') || message.includes('network')) message = 'Network error. Check connection and try again.';
    const httpStatus = error?.status === 429 || error?.status === 402 ? error.status : 500;

    return new Response(JSON.stringify({
      success: false, error: message,
      rateLimited: httpStatus === 429, creditsExhausted: httpStatus === 402,
      http_status: httpStatus, retryable: httpStatus >= 500,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
