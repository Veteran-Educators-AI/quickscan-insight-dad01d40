import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Subject detection keywords and their corresponding NYS standards
interface SubjectPattern {
  id: string;
  name: string;
  keywords: string[];
  standardPrefixes: string[];
  sampleStandards: string[];
}

const SUBJECT_PATTERNS: SubjectPattern[] = [
  {
    id: 'geometry',
    name: 'Geometry',
    keywords: [
      'triangle', 'angle', 'parallel', 'perpendicular', 'congruent', 'similar',
      'proof', 'theorem', 'postulate', 'polygon', 'quadrilateral', 'circle',
      'radius', 'diameter', 'circumference', 'area', 'perimeter', 'volume',
      'surface area', 'pythagorean', 'hypotenuse', 'sine', 'cosine', 'tangent',
      'rotation', 'reflection', 'translation', 'dilation', 'transformation',
      'coordinate', 'slope', 'midpoint', 'distance formula', 'bisector',
      'inscribed', 'circumscribed', 'arc', 'sector', 'chord', 'secant',
      'SAS', 'ASA', 'SSS', 'AAS', 'HL', 'CPCTC', 'altitude', 'median',
      'centroid', 'orthocenter', 'incenter', 'circumcenter'
    ],
    standardPrefixes: ['G.CO', 'G.SRT', 'G.C', 'G.GPE', 'G.GMD', 'G.MG'],
    sampleStandards: ['G.CO.A.1', 'G.SRT.B.5', 'G.C.A.2', 'G.GPE.B.4']
  },
  {
    id: 'algebra1',
    name: 'Algebra I',
    keywords: [
      'linear', 'equation', 'variable', 'coefficient', 'constant', 'slope',
      'y-intercept', 'graph', 'function', 'domain', 'range', 'inequality',
      'system', 'substitution', 'elimination', 'quadratic', 'parabola',
      'vertex', 'factoring', 'FOIL', 'polynomial', 'exponent', 'radical',
      'square root', 'absolute value', 'expression', 'simplify', 'solve',
      'rate of change', 'arithmetic sequence', 'scatter plot', 'correlation',
      'literal equation', 'proportion', 'ratio', 'percent'
    ],
    standardPrefixes: ['A.SSE', 'A.APR', 'A.CED', 'A.REI', 'F.IF', 'F.BF', 'F.LE', 'N.RN', 'S.ID'],
    sampleStandards: ['A.SSE.A.1', 'A.REI.B.3', 'F.IF.B.4', 'A.CED.A.1']
  },
  {
    id: 'algebra2',
    name: 'Algebra II',
    keywords: [
      'polynomial', 'rational', 'logarithm', 'exponential', 'complex number',
      'imaginary', 'conjugate', 'asymptote', 'end behavior', 'inverse function',
      'composition', 'transformation', 'trigonometric', 'radian', 'unit circle',
      'amplitude', 'period', 'phase shift', 'sequence', 'series', 'summation',
      'binomial', 'pascal', 'permutation', 'combination', 'probability',
      'normal distribution', 'standard deviation', 'z-score', 'regression',
      'remainder theorem', 'factor theorem', 'synthetic division'
    ],
    standardPrefixes: ['A.SSE', 'A.APR', 'A.CED', 'A.REI', 'F.IF', 'F.BF', 'F.LE', 'F.TF', 'N.CN', 'S.IC', 'S.CP', 'S.MD'],
    sampleStandards: ['A.APR.B.2', 'F.TF.A.1', 'N.CN.A.1', 'S.IC.B.4']
  },
  {
    id: 'biology',
    name: 'Biology',
    keywords: [
      'cell', 'DNA', 'RNA', 'protein', 'gene', 'chromosome', 'mitosis', 'meiosis',
      'photosynthesis', 'respiration', 'ATP', 'enzyme', 'organism', 'ecosystem',
      'evolution', 'natural selection', 'mutation', 'adaptation', 'species',
      'population', 'biodiversity', 'food chain', 'food web', 'producer',
      'consumer', 'decomposer', 'homeostasis', 'hormone', 'nervous system',
      'immune', 'virus', 'bacteria', 'organelle', 'membrane', 'nucleus',
      'ribosome', 'mitochondria', 'chloroplast', 'genetics', 'heredity',
      'Punnett square', 'dominant', 'recessive', 'allele', 'genotype', 'phenotype'
    ],
    standardPrefixes: ['LS', 'BIO'],
    sampleStandards: ['LS1.A', 'LS2.B', 'LS3.A', 'LS4.C']
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    keywords: [
      'atom', 'element', 'compound', 'molecule', 'ion', 'electron', 'proton',
      'neutron', 'periodic table', 'atomic number', 'atomic mass', 'isotope',
      'chemical reaction', 'reactant', 'product', 'balance', 'mole', 'molarity',
      'solution', 'solute', 'solvent', 'acid', 'base', 'pH', 'oxidation',
      'reduction', 'redox', 'electronegativity', 'bond', 'covalent', 'ionic',
      'metallic', 'Lewis structure', 'VSEPR', 'enthalpy', 'entropy', 'Gibbs',
      'equilibrium', 'Le Chatelier', 'stoichiometry', 'limiting reagent',
      'concentration', 'dilution', 'titration', 'catalyst', 'activation energy'
    ],
    standardPrefixes: ['PS', 'CHEM'],
    sampleStandards: ['PS1.A', 'PS1.B', 'PS2.B', 'PS3.D']
  },
  {
    id: 'physics',
    name: 'Physics',
    keywords: [
      'force', 'motion', 'velocity', 'acceleration', 'momentum', 'Newton',
      'gravity', 'friction', 'mass', 'weight', 'energy', 'kinetic', 'potential',
      'work', 'power', 'wave', 'frequency', 'wavelength', 'amplitude',
      'electromagnetic', 'electric', 'magnetic', 'circuit', 'current', 'voltage',
      'resistance', 'Ohm', 'capacitor', 'inductor', 'thermodynamics', 'heat',
      'temperature', 'pressure', 'fluid', 'buoyancy', 'optics', 'lens', 'mirror',
      'reflection', 'refraction', 'diffraction', 'interference', 'nuclear',
      'radioactive', 'half-life', 'relativity', 'quantum'
    ],
    standardPrefixes: ['PS', 'PHYS'],
    sampleStandards: ['PS2.A', 'PS3.A', 'PS4.A', 'PS4.B']
  },
  {
    id: 'english',
    name: 'English Language Arts',
    keywords: [
      'thesis', 'argument', 'evidence', 'claim', 'counterclaim', 'rhetoric',
      'ethos', 'pathos', 'logos', 'metaphor', 'simile', 'imagery', 'symbolism',
      'theme', 'motif', 'character', 'plot', 'setting', 'conflict', 'resolution',
      'narrator', 'point of view', 'tone', 'mood', 'irony', 'foreshadowing',
      'allusion', 'personification', 'hyperbole', 'diction', 'syntax', 'grammar',
      'paragraph', 'essay', 'introduction', 'conclusion', 'transition', 'citation',
      'source', 'analysis', 'inference', 'main idea', 'supporting detail'
    ],
    standardPrefixes: ['RL', 'RI', 'W', 'SL', 'L'],
    sampleStandards: ['RL.9-10.1', 'RI.9-10.2', 'W.9-10.1', 'L.9-10.1']
  },
  {
    id: 'history',
    name: 'History/Social Studies',
    keywords: [
      'revolution', 'constitution', 'democracy', 'republic', 'government',
      'war', 'treaty', 'amendment', 'civil rights', 'movement', 'colonization',
      'independence', 'industrial', 'reform', 'immigration', 'migration',
      'economy', 'trade', 'imperialism', 'nationalism', 'globalization',
      'primary source', 'secondary source', 'perspective', 'bias', 'cause',
      'effect', 'continuity', 'change', 'turning point', 'era', 'decade',
      'century', 'civilization', 'culture', 'society', 'political', 'social'
    ],
    standardPrefixes: ['RH', 'WHST', 'SS'],
    sampleStandards: ['RH.9-10.1', 'WHST.9-10.1', 'SS.1.1']
  },
  {
    id: 'financialmath',
    name: 'Financial Math',
    keywords: [
      'budget', 'income', 'expense', 'savings', 'investment', 'interest',
      'compound interest', 'simple interest', 'principal', 'loan', 'mortgage',
      'credit', 'debit', 'tax', 'gross pay', 'net pay', 'paycheck', 'W-4',
      'insurance', 'premium', 'deductible', 'stock', 'bond', 'mutual fund',
      'retirement', '401k', 'IRA', 'inflation', 'depreciation', 'APR', 'APY',
      'credit score', 'credit card', 'minimum payment', 'balance', 'statement'
    ],
    standardPrefixes: ['NGPF', 'FIN'],
    sampleStandards: ['NGPF.1.1', 'NGPF.2.1', 'NGPF.3.1']
  }
];

// Detect subject area from OCR text
function detectSubjectFromText(ocrText: string): { subject: SubjectPattern | null; confidence: 'high' | 'medium' | 'low'; matchedKeywords: string[] } {
  if (!ocrText || ocrText.trim().length < 10) {
    return { subject: null, confidence: 'low', matchedKeywords: [] };
  }

  const textLower = ocrText.toLowerCase();
  const subjectScores: { pattern: SubjectPattern; score: number; matches: string[] }[] = [];

  for (const pattern of SUBJECT_PATTERNS) {
    const matches: string[] = [];
    let score = 0;

    for (const keyword of pattern.keywords) {
      // Use word boundary matching for more accurate detection
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const occurrences = (textLower.match(regex) || []).length;
      if (occurrences > 0) {
        matches.push(keyword);
        score += occurrences * (keyword.length > 5 ? 2 : 1); // Longer keywords get higher weight
      }
    }

    if (score > 0) {
      subjectScores.push({ pattern, score, matches });
    }
  }

  // Sort by score descending
  subjectScores.sort((a, b) => b.score - a.score);

  if (subjectScores.length === 0) {
    return { subject: null, confidence: 'low', matchedKeywords: [] };
  }

  const topMatch = subjectScores[0];
  const secondMatch = subjectScores[1];

  // Determine confidence based on score and differentiation from second place
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (topMatch.score >= 10 && (!secondMatch || topMatch.score > secondMatch.score * 1.5)) {
    confidence = 'high';
  } else if (topMatch.score >= 5) {
    confidence = 'medium';
  }

  return {
    subject: topMatch.pattern,
    confidence,
    matchedKeywords: topMatch.matches.slice(0, 10) // Limit to top 10 for logging
  };
}

// Generate subject-specific NYS standards context
function generateSubjectStandardsContext(subject: SubjectPattern | null, detectedKeywords: string[]): string {
  if (!subject) {
    return '';
  }

  return `
AUTO-DETECTED SUBJECT AREA: ${subject.name}
Based on content analysis, this appears to be ${subject.name} work.
Detected keywords: ${detectedKeywords.join(', ')}

RELEVANT NYS STANDARD PREFIXES for ${subject.name}:
${subject.standardPrefixes.map(p => `- ${p}.*`).join('\n')}

When identifying the NYS Standard, prioritize standards from these prefix families.
Sample standards for this subject: ${subject.sampleStandards.join(', ')}

IMPORTANT: Use the detected subject to accurately identify which specific standard applies to this problem.
`;
}

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

// ═══════════════════════════════════════════════════════════════════════════════
// AI MODEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
//
// TIER SYSTEM:
// - LITE: Fast/cheap for simple tasks (OCR, blank detection, identification)
// - STANDARD: Default for main grading analysis with detailed feedback
// - PREMIUM: Best quality for handwriting OCR + deep educational analysis (GPT-4o)
//
// ANALYSIS PROVIDER (teacher-selectable via Settings):
// - 'gemini'  → standard tier uses Gemini 2.5 Flash       (~$0.15/1M tokens)
// - 'gpt4o'   → standard tier uses GPT-4o                 (~$2.50/1M input, $10/1M output)
// - 'gpt4o-mini' → standard tier uses GPT-4o Mini         (~$0.15/1M input, $0.60/1M output)
//
// GPT-4o ADVANTAGES for student work analysis:
// - Superior handwriting recognition (especially messy/young student writing)
// - Better at structured educational feedback
// - More accurate OCR of mathematical notation and diagrams
// - Higher cost but significantly better analysis quality
//
// GPT-4o Mini is a great middle ground:
// - Much better handwriting OCR than Gemini Flash Lite
// - Comparable to Gemini Flash for analysis quality
// - Similar cost to Gemini Flash
//
// COST COMPARISON per scan (approximate):
// - Gemini Flash Lite (helper calls only): ~$0.001
// - Gemini Flash (main analysis):          ~$0.01-0.02
// - GPT-4o Mini (main analysis):           ~$0.01-0.03
// - GPT-4o (main analysis):                ~$0.05-0.15
// ═══════════════════════════════════════════════════════════════════════════════

type AnalysisProvider = 'gemini' | 'gpt4o' | 'gpt4o-mini';

// Model used for the main grading analysis based on teacher preference
function getAnalysisModel(provider: AnalysisProvider): string {
  switch (provider) {
    case 'gpt4o':
      return 'openai/gpt-4o';           // Best quality: superior handwriting OCR + analysis
    case 'gpt4o-mini':
      return 'openai/gpt-4o-mini';      // Good balance: better OCR than Gemini, similar cost
    case 'gemini':
    default:
      return 'google/gemini-2.5-flash';  // Default: good quality, fast, affordable
  }
}

// Lite model for simple helper tasks (always Gemini Flash Lite - cheapest)
const LITE_MODEL = 'google/gemini-2.5-flash-lite';

type AIModelTier = 'lite' | 'standard';

// Helper function to call Lovable AI Gateway with token logging
async function callLovableAI(
  messages: any[], 
  apiKey: string, 
  functionName: string = 'analyze-student-work',
  supabase?: any,
  userId?: string,
  modelTier: AIModelTier = 'lite',
  analysisProvider: AnalysisProvider = 'gemini'
) {
  const model = modelTier === 'standard' ? getAnalysisModel(analysisProvider) : LITE_MODEL;
  const isOpenAIModel = model.startsWith('openai/');
  const maxTokens = modelTier === 'standard' ? 6000 : 4000;
  const startTime = Date.now();
  
  console.log(`[AI_CALL] function=${functionName} model=${model} tier=${modelTier} provider=${analysisProvider}`);
  
  // OpenAI models use max_completion_tokens instead of max_tokens
  const tokenParams = isOpenAIModel 
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      ...tokenParams,
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
  console.log(`[TOKEN_USAGE] function=${functionName} model=${model} tier=${modelTier} provider=${analysisProvider} prompt_tokens=${usage.prompt_tokens || 0} completion_tokens=${usage.completion_tokens || 0} total_tokens=${usage.total_tokens || 0} latency_ms=${latencyMs}`);
  
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

// ─── Blank Page Detection (server-side, duplicated from src/lib/blankPageDetection.ts) ───
const BOILERPLATE_PATTERNS_SERVER = [
  /^name\s*[:.]?\s*/gim,
  /^date\s*[:.]?\s*/gim,
  /^period\s*[:.]?\s*/gim,
  /^class\s*[:.]?\s*/gim,
  /^page\s*\d+/gim,
  /^side\s*[ab]/gim,
  /^#?\s*\d+\s*$/gm,
  /^question\s*\d*\s*[:.]?\s*$/gim,
  /^q\d+\s*[:.]?\s*$/gim,
  /^problem\s*\d*\s*[:.]?\s*$/gim,
  /^directions?\s*[:.]?\s*/gim,
  /^instructions?\s*[:.]?\s*/gim,
  /^show\s+your\s+work/gim,
  /^answer\s*[:.]?\s*$/gim,
  /^work\s*[:.]?\s*$/gim,
  /^\s*[-–—_]{3,}\s*$/gm,
];

function detectBlankPageFromText(rawText: string | null | undefined, threshold = 20): {
  isBlank: boolean;
  normalizedLength: number;
  detectionReason: 'TEXT_LENGTH' | 'NOT_BLANK';
  normalizedText: string;
} {
  if (!rawText || rawText.toUpperCase().includes('BLANK_PAGE')) {
    return { isBlank: true, normalizedLength: 0, detectionReason: 'TEXT_LENGTH', normalizedText: '' };
  }

  let text = rawText;
  for (const pattern of BOILERPLATE_PATTERNS_SERVER) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, '');
  }
  text = text.replace(/\s+/g, ' ').trim();

  const isBlank = text.length < threshold;
  return {
    isBlank,
    normalizedLength: text.length,
    detectionReason: isBlank ? 'TEXT_LENGTH' : 'NOT_BLANK',
    normalizedText: text,
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

    const { imageBase64, additionalImages, solutionBase64, answerGuideBase64, questionId, rubricSteps, identifyOnly, detectPageType, studentRoster, studentName, teacherId, assessmentMode, promptText, compareMode, standardCode, topicName, customRubric, gradeFloor: customGradeFloor, gradeFloorWithEffort: customGradeFloorWithEffort, useLearnedStyle, blankPageSettings } = await req.json();
    
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

    // ─── Blank Page Detection (Phase 1) ───────────────────────────────
    // If the caller passed blankPageSettings.enabled, run a quick lightweight
    // OCR pass to extract text, then check if the page is blank.
    // This avoids the expensive grading LLM call for empty pages.
    if (blankPageSettings?.enabled) {
      console.log('Blank page detection enabled — running lightweight OCR pre-check...');
      try {
        const quickOcrResult = await callLovableAI([
          { role: 'system', content: 'You are an OCR tool. Extract ALL visible text from this image exactly as written. Include handwritten text, printed text, numbers, equations, and any symbols. If the page contains ONLY printed content (questions, headers, instructions) and NO student handwriting/marks, say "BLANK_PAGE". Output ONLY the extracted text, nothing else.' },
          { role: 'user', content: [
            { type: 'text', text: 'Extract all text from this image:' },
            formatImageForLovableAI(imageBase64),
          ] },
        ], LOVABLE_API_KEY, 'blank-page-ocr-check');

        // Normalize the OCR result using the same logic as the client-side utility
        const blankCheckResult = detectBlankPageFromText(quickOcrResult);
        console.log(`Blank page check: isBlank=${blankCheckResult.isBlank}, normalizedLength=${blankCheckResult.normalizedLength}, text="${blankCheckResult.normalizedText.substring(0, 80)}"`);

        if (blankCheckResult.isBlank) {
          console.log('Page detected as BLANK — skipping LLM grading, returning configured score');
          const blankScore = blankPageSettings.score ?? 55;
          const blankComment = blankPageSettings.comment ?? 'No work shown on this page; score assigned per no-response policy.';

          const blankResult = {
            ocrText: quickOcrResult || '',
            problemIdentified: 'No student work detected',
            approachAnalysis: 'No student work to analyze',
            rubricScores: [],
            misconceptions: [],
            totalScore: { earned: 0, possible: 4, percentage: 0 },
            grade: blankScore,
            gradeJustification: blankComment,
            feedback: 'This page appears to have no student work. If this is incorrect, please re-scan with better lighting or check that the correct page was uploaded.',
            regentsScore: 0,
            regentsScoreJustification: 'No student work present — Score 0',
            noResponse: true,
            noResponseReason: blankCheckResult.detectionReason,
          };

          return new Response(JSON.stringify({
            success: true,
            analysis: blankResult,
            rawAnalysis: `[BLANK PAGE DETECTED] OCR text: "${quickOcrResult}". Normalized length: ${blankCheckResult.normalizedLength}. Detection reason: ${blankCheckResult.detectionReason}.`,
            blankPageDetected: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (blankCheckError) {
        console.error('Blank page pre-check failed, continuing with normal analysis:', blankCheckError);
        // Non-fatal — continue to regular analysis
      }
    }

    console.log('Analyzing student work image...');
    console.log('Question ID:', questionId || 'Not specified');
    console.log('Assessment mode:', assessmentMode || 'teacher');
    console.log('Rubric steps provided:', rubricSteps?.length || 0);

    // Fetch teacher settings early (for verbosity, grade floor, training mode, and AI provider)
    let feedbackVerbosity = 'concise';
    let gradeFloor = customGradeFloor || 55;
    let gradeFloorWithEffort = customGradeFloorWithEffort || 65;
    let aiTrainingMode = 'learning';
    let analysisProvider: AnalysisProvider = 'gemini';
    
    if (effectiveTeacherId && supabase) {
      try {
        const { data: settingsData } = await supabase
          .from('settings')
          .select('grade_floor, grade_floor_with_effort, ai_feedback_verbosity, ai_training_mode, analysis_provider')
          .eq('teacher_id', effectiveTeacherId)
          .maybeSingle();
        
        if (settingsData) {
          if (!customGradeFloor) {
            gradeFloor = settingsData.grade_floor ?? 55;
            gradeFloorWithEffort = settingsData.grade_floor_with_effort ?? 65;
          }
          feedbackVerbosity = settingsData.ai_feedback_verbosity ?? 'concise';
          aiTrainingMode = settingsData.ai_training_mode ?? 'learning';
          // Read teacher's preferred AI provider for analysis
          const provider = settingsData.analysis_provider;
          if (provider === 'gpt4o' || provider === 'gpt4o-mini' || provider === 'gemini') {
            analysisProvider = provider;
          }
        }
      } catch (settingsError) {
        console.error('Error fetching teacher settings:', settingsError);
      }
    }
    console.log('Feedback verbosity:', feedbackVerbosity);
    console.log('AI training mode:', aiTrainingMode);
    console.log('Analysis provider:', analysisProvider);

    // Fetch grading corrections for AI training (if training mode is enabled or useLearnedStyle is true)
    let gradingStyleContext = '';
    const shouldUseLearnedStyle = useLearnedStyle === true || aiTrainingMode !== 'off';
    if (supabase && effectiveTeacherId && shouldUseLearnedStyle) {
      try {
        const { data: corrections } = await supabase
          .from('grading_corrections')
          .select('ai_grade, corrected_grade, correction_reason, grading_focus, strictness_indicator, topic_name')
          .eq('teacher_id', effectiveTeacherId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (corrections && corrections.length > 0) {
          // Analyze teacher's grading patterns
          const avgDiff = corrections.reduce((sum: number, c: any) => sum + (c.corrected_grade - c.ai_grade), 0) / corrections.length;
          const strictnessPatterns = corrections.filter((c: any) => c.strictness_indicator).map((c: any) => c.strictness_indicator);
          const mostCommonStrictness = strictnessPatterns.length > 0 
            ? strictnessPatterns.sort((a: string, b: string) =>
                strictnessPatterns.filter((v: string) => v === a).length - strictnessPatterns.filter((v: string) => v === b).length
              ).pop()
            : null;

          // Get common grading focuses
          const allFocuses = corrections.flatMap((c: any) => c.grading_focus || []);
          const focusCounts: Record<string, number> = {};
          allFocuses.forEach((f: string) => { focusCounts[f] = (focusCounts[f] || 0) + 1; });
          const topFocuses = Object.entries(focusCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([focus]) => focus);

          // Get specific correction examples
          const recentExamples = corrections.slice(0, 5).map((c: any) => 
            `• AI gave ${c.ai_grade}, teacher corrected to ${c.corrected_grade}${c.correction_reason ? `: "${c.correction_reason}"` : ''}`
          ).join('\n');

          const learnedModePrefix = useLearnedStyle ? 'CRITICAL: You MUST use this teacher\'s learned grading style for all grading decisions.\n\n' : '';
          
          gradingStyleContext = `
${learnedModePrefix}TEACHER'S GRADING STYLE (Learned from ${corrections.length} corrections):

GRADING TENDENCY:
- Teacher typically ${avgDiff > 3 ? 'gives HIGHER grades than AI' : avgDiff < -3 ? 'gives LOWER grades than AI' : 'agrees with AI grading'}
- Average grade adjustment: ${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(1)} points
${mostCommonStrictness ? `- Overall style: ${mostCommonStrictness === 'more_lenient' ? 'More LENIENT than standard' : mostCommonStrictness === 'more_strict' ? 'More STRICT than standard' : 'Standard strictness'}` : ''}

${topFocuses.length > 0 ? `TEACHER PRIORITIES (What they focus on when grading):
${topFocuses.map(f => `• ${f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`).join('\n')}` : ''}

RECENT CORRECTION EXAMPLES:
${recentExamples}

${useLearnedStyle ? 'YOU MUST APPLY THIS STYLE: ' : 'APPLY THIS STYLE: '}Grade in a way that aligns with this teacher's demonstrated preferences. ${avgDiff > 3 ? 'Be more generous with partial credit.' : avgDiff < -3 ? 'Be stricter about showing complete work.' : ''}
`;
          console.log(`Loaded ${corrections.length} grading corrections for training context${useLearnedStyle ? ' (LEARNED STYLE MODE)' : ''}`);
        }
      } catch (correctionError) {
        console.error('Error fetching grading corrections:', correctionError);
      }
    }

    // Fetch teacher answer samples for the topic (NEW: Learn from teacher's own solutions)
    let teacherAnswerSampleContext = '';
    if (supabase && effectiveTeacherId && topicName) {
      try {
        const { data: samples } = await supabase
          .from('teacher_answer_samples')
          .select('topic_name, ocr_text, key_steps, grading_emphasis, question_context')
          .eq('teacher_id', effectiveTeacherId)
          .or(`topic_name.ilike.%${topicName}%,nys_standard.ilike.%${standardCode || ''}%`)
          .order('created_at', { ascending: false })
          .limit(3);

        if (samples && samples.length > 0) {
          const sampleDescriptions = samples.map((s: any, idx: number) => {
            let desc = `Sample ${idx + 1} (${s.topic_name}):`;
            if (s.grading_emphasis) desc += `\n  GRADING FOCUS: ${s.grading_emphasis}`;
            if (s.ocr_text) desc += `\n  TEACHER'S APPROACH: ${s.ocr_text.substring(0, 500)}...`;
            if (s.key_steps && s.key_steps.length > 0) desc += `\n  KEY STEPS: ${s.key_steps.join(', ')}`;
            return desc;
          }).join('\n\n');

          teacherAnswerSampleContext = `
TEACHER'S OWN ANSWER SAMPLES FOR THIS TOPIC:
The teacher has provided their own solutions showing how THEY solve problems like this.
CRITICAL: Compare the student's work to the teacher's approach and value similar methods/notation.

${sampleDescriptions}

APPLY TEACHER'S APPROACH:
- Grade based on how well the student matches the teacher's demonstrated method
- Value the same steps and notation the teacher uses
- The teacher's emphasis on what matters should guide your scoring
`;
          console.log(`Loaded ${samples.length} teacher answer samples for topic context`);
        }
      } catch (sampleError) {
        console.error('Error fetching teacher answer samples:', sampleError);
      }
    }

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

    // Auto-detect subject context placeholder - will be populated after initial OCR
    let autoDetectedSubjectContext = '';
    
    let systemPrompt: string;
    let userPromptText: string;

    // HALLUCINATION-SHIELD CORE PRINCIPLES - Applied to all AI analysis
    const hallucinationShieldContext = `
CRITICAL ANALYSIS CONSTRAINTS (Hallucination-Shield Protocol):

** MANDATORY 3X ZOOM PRE-ANALYSIS PROTOCOL **
BEFORE you begin ANY grading, you MUST mentally "zoom in" at 3x magnification across the ENTIRE image:
1. ZOOM SCAN - TOP ZONE: Examine the top 1/3 of the page at 3x detail - look for work above questions, in headers, margins
2. ZOOM SCAN - MIDDLE ZONE: Examine the middle 1/3 of the page at 3x detail - the main answer areas
3. ZOOM SCAN - BOTTOM ZONE: Examine the bottom 1/3 of the page at 3x detail - including margins and blank areas
4. ZOOM SCAN - LEFT EDGE: Examine the left margin from top to bottom at 3x detail
5. ZOOM SCAN - RIGHT EDGE: Examine the right margin from top to bottom at 3x detail
6. ZOOM SCAN - CORNERS: Examine each of the 4 corners at 3x detail for any calculations or notes

You MUST complete this 6-zone zoom scan BEFORE analyzing any answers. Report any work found in each zone.

MANDATORY PRE-GRADING PROTOCOL:
** CRITICAL: READ THE QUESTION 3 TIMES BEFORE GRADING **
Before analyzing any student work, you MUST:
1. FIRST PASS: Read the question to understand the general topic
2. SECOND PASS: Identify EXACTLY what is being asked - what specific calculation or answer is required?
3. THIRD PASS: Confirm the scope - does the question ask for the FULL answer or just a PART of a larger problem?

Example of correct scope identification:
- Question: "What is the area of the rectangular PART of this figure?"
  → ONLY grade the rectangle area calculation, NOT the full composite figure area
- Question: "Calculate the TOTAL area of the composite figure"
  → Grade for ALL component areas combined

** CRITICAL: DO NOT penalize students for not doing work the question did NOT ask for! **

EXPANDED SPATIAL ANALYSIS PROTOCOL:
** CRITICAL: EXPAND YOUR SEARCH RADIUS AROUND EACH QUESTION **
For EACH question you grade, you MUST search for related work in an EXPANDED RADIUS:
1. ABOVE THE QUESTION: Look 2-3 inches above the question text for calculations, notes, or work
2. BELOW THE QUESTION: Look 2-3 inches below the answer space for additional work
3. LEFT OF THE QUESTION: Check the left margin adjacent to the question (within 2 inches)
4. RIGHT OF THE QUESTION: Check the right margin adjacent to the question (within 2 inches)
5. DIAGONAL ZONES: Check the diagonal corners around each question
6. VICINITY WORK: Any work within 3 inches of a question that relates to that question's topic MUST be considered

Students often:
- Start calculations above a question then continue below
- Write in margins next to questions
- Use blank spaces between questions for scratch work
- Place final answers in different locations than expected

** ALL WORK IN THE VICINITY OF A QUESTION MUST BE CONSIDERED AS POTENTIALLY PART OF THAT ANSWER **

** CORRECT ANSWER GRADING RULE - MINIMUM 90% FOR CORRECT ANSWERS **
*** THIS RULE ONLY APPLIES WHEN THE STUDENT'S ANSWER IS CORRECT ***

CRITICAL RULE: When a student produces a CORRECT ANSWER to a problem:
- The student MUST receive at MINIMUM 90% credit (grade of 90 or higher)
- Maximum deduction for lack of shown work is 5-10% ONLY
- This applies even if:
  * Work shown is minimal or sparse
  * Work is messy or unconventionally placed
  * Student only shows answer without full steps
- CORRECT ANSWER = MASTERY DEMONSTRATED = 90-100%

DEDUCTION GUIDELINES FOR CORRECT ANSWERS ONLY:
- Full work shown clearly → 100%
- Some work shown → 95-100%
- Minimal work but answer correct → 90-95%
- Answer correct but NO work at all → 90% (bare minimum)
- NEVER grade a correct answer below 90%

*** INCOMPLETE FINAL ANSWER DEDUCTION RULE ***
If the student's mathematical work/setup is CORRECT but the final answer is:
- Missing entirely (no boxed/circled answer, no "=" with result)
- Incomplete (stopped mid-calculation, left as unsimplified expression when simplification was required)
- Not clearly stated (work ends abruptly without conclusion)

THEN: Deduct 5-10 points from what would have been earned.
- Good work setup with missing final answer → Deduct 5-10 points
- Work is 95% quality but no conclusion → Maximum grade is 90%
- This applies even when all mathematical steps are correct

Example: Student correctly sets up L = (90/360) × 2π × 10 = (1/4) × 20π but doesn't write "L = 5π" as final answer
→ Deduct 5-10 points for incomplete final answer

*** WHEN THE ANSWER IS INCORRECT - NORMAL GRADING APPLIES ***
If the student's final answer is WRONG, this 90% minimum rule does NOT apply:
- Grade based on the concepts they demonstrate understanding of
- Apply standard NYS Regents scoring guidelines (Score 0-4 → Grade 55-100)
- Partial credit based on correct work shown, even if final answer is wrong
- Standard point deductions for errors apply normally

SUMMARY:
- CORRECT answer → Minimum 90%, max 10% deduction for work issues
- CORRECT work but MISSING/INCOMPLETE final answer → Deduct 5-10 points
- INCORRECT answer → Normal grading based on understanding shown (55-100 scale)

RATIONALE: A correct answer proves the student understands the concept. 
Penalizing too harshly for not showing work when the answer is RIGHT is unfair.
However, students must learn to complete their work with a clear final answer.
When the answer is wrong, we need to evaluate understanding through work shown.

FULL-PAGE WORK SCANNING PROTOCOL:
** CRITICAL: SCAN THE ENTIRE PAGE FOR STUDENT WORK **
Students often write work in unconventional locations:
1. Margins (top, bottom, left, right) - up to the very edge of the page
2. Headers and blank spaces above questions
3. Between questions in any white space
4. In any white space on the page including corners
5. Near diagrams but not directly under answer lines
6. Upside down or sideways in margins
7. In small handwriting that requires close inspection

When extracting OCR text:
- Scan ALL four corners of the page carefully at maximum detail
- Look for calculations written above question text
- Check margins for scratch work and partial calculations
- Work written ANYWHERE on the page related to a question counts as part of their answer
- A calculation like "8x4=32" written in the top-right corner still counts as showing work for a rectangle area question
- Small or faint writing must still be captured

** DO NOT mark a student down for "not showing work" if work IS visible ANYWHERE on the page! **

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
   - For work found in margins/vicinity: "Student's work in [specific location] shows '[exact quote]'..."

4. VERIFICATION FLAGS: Mark claims that need teacher confirmation:
   - HIGH CONFIDENCE: Clearly visible and unambiguous
   - MEDIUM CONFIDENCE: Readable but may have alternative interpretations  
   - NEEDS VERIFICATION: "[INTERPRETATION - VERIFY: ...]" - flag for teacher to confirm

5. BALANCED INTERPRETATION (Not overly restrictive):
   - DO interpret what student "probably meant" when context makes it clear
   - DO consider mathematical context (e.g., a variable that looks like a number)
   - DO give students credit for reasonable interpretations of their work
   - DO credit work written ANYWHERE on the page (margins, headers, corners, vicinity of questions)
   - BUT flag significant interpretations so teachers can verify: "[INTERPRETATION - VERIFY: ...]"
   - Do NOT fabricate entire solutions or understanding that has no basis in visible work
   - Do NOT penalize for work not asked by the question

6. *** EVIDENCE-BASED GRADING MANDATE ***
   CRITICAL: EVERY grade justification, strength, and error MUST directly quote the student's actual handwritten work.
   
   YOU MUST USE THIS FORMAT for citing student work:
   - "Student wrote: '[exact text/equation copied from their paper]'"
   - "In [location on page], student shows: '[exact quote]'"
   
   NEVER use vague language like:
   ✗ "Student showed understanding" (WHAT did they write that shows this?)
   ✗ "Work demonstrates knowledge" (QUOTE the specific work!)
   ✗ "Some errors were present" (QUOTE the exact errors!)
   ✗ "Student attempted the problem" (WHAT specifically did they write?)
   
   ALWAYS use specific language like:
   ✓ "Student wrote: 'A = πr² = π(5)² = 25π' correctly applying the area formula"
   ✓ "Student wrote: '2πr = 2π(5) = 10π' using circumference formula instead of area"
   ✓ "Student's equation 'y = 3x + 2' correctly identifies slope as 3"
   
   If you cannot quote specific student work, you cannot claim they demonstrated or failed to demonstrate understanding.
`;

    if (isAIMode) {
      systemPrompt = `You are a precise and factual NYS Regents grader for ALL academic subjects. Your goal is to provide assessment based STRICTLY on verified observations from student work.

CRITICAL - SUBJECT DETECTION:
You MUST first identify the SUBJECT AREA of this work based on the content you observe (Math, Science, English, History, etc.).
Then apply the appropriate NYS standards for that subject.

${hallucinationShieldContext}
${verificationContext}
${gradingStyleContext}
${autoDetectedSubjectContext}

Your task is to:
1. Perform OCR on the student's work to extract all text, equations, diagrams, and expressions - cite exactly what you see
2. IDENTIFY THE SUBJECT AREA based on content keywords and context
3. Identify the specific problem/task the student is addressing and which NYS standard it aligns with
4. SOLVE THE PROBLEM YOURSELF (if applicable) to determine the correct answer and approach
5. Compare the student's work against the correct solution using NYS Regents scoring guidelines
6. Determine if the student's answer is correct - with specific evidence
7. Identify any misconceptions or errors in the student's reasoning - cite the exact work showing this
8. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
9. Provide constructive, standards-aligned feedback based only on observed work

${regentsContext}
${customRubricContext}
${standardContext}

${teacherGuideContext}

SUBJECT-SPECIFIC NYS STANDARDS GUIDE:
- MATH (Geometry): G.CO.*, G.SRT.*, G.C.*, G.GPE.*, G.GMD.*, G.MG.*
- MATH (Algebra I): A.SSE.*, A.APR.*, A.CED.*, A.REI.*, F.IF.*, F.BF.*, F.LE.*
- MATH (Algebra II): A.SSE.*, A.APR.*, F.IF.*, F.BF.*, F.TF.*, N.CN.*, S.IC.*, S.CP.*
- SCIENCE (Biology): LS1.*, LS2.*, LS3.*, LS4.*
- SCIENCE (Chemistry): PS1.*, PS2.*, PS3.*
- SCIENCE (Physics): PS2.*, PS3.*, PS4.*
- ENGLISH: RL.*, RI.*, W.*, SL.*, L.*
- HISTORY/SS: RH.*, WHST.*, SS.*
- FINANCIAL MATH: NGPF.*, FIN.*

CRITICAL: Detect the subject from the content and use the appropriate standard prefixes.
If you cannot clearly read something, make your best interpretation but flag it with "[INTERPRETATION - VERIFY: ...]" for teacher review.`;

      userPromptText = `Please analyze this student's work${isTeacherGuidedMode ? ' using the teacher\'s answer guide as reference' : ' using NYS Regents scoring standards'}.

IMPORTANT: 
1. First, IDENTIFY THE SUBJECT AREA from the content (Math, Science, English, History, etc.)
2. ${isTeacherGuidedMode ? 'Use the teacher\'s answer guide to determine correct answers and grading criteria.' : 'Apply the appropriate NYS standards for the detected subject.'}`;

      if (promptText) {
        userPromptText += `\n\nThe problem statement is: ${promptText}`;
      }

      userPromptText += `

Steps to follow:
1. Extract all text and content from the image (OCR)
2. DETECT THE SUBJECT AREA based on vocabulary, formulas, and context
3. Identify the problem being solved and its related NYS standard (use subject-appropriate prefix)
4. Solve the problem yourself (if applicable) to get the correct answer
5. Compare the student's solution to your solution
6. Apply NYS Regents scoring rubric (0-4 scale)
7. Convert to 55-100 grade scale
8. Report the detected subject in your response`;

    } else {
      systemPrompt = `You are a precise and factual NYS Regents grader for ALL academic subjects. Your goal is to provide assessment based STRICTLY on verified observations from student work.

CRITICAL - SUBJECT DETECTION:
You MUST first identify the SUBJECT AREA of this work based on the content you observe (Math, Science, English, History, etc.).
Then apply the appropriate NYS standards for that subject.

${hallucinationShieldContext}
${verificationContext}
${gradingStyleContext}
${teacherAnswerSampleContext}
${autoDetectedSubjectContext}

Your task is to:
1. Perform OCR on the student's work to extract all text, equations, diagrams, and expressions - cite exactly what you see
2. IDENTIFY THE SUBJECT AREA based on content keywords and context
3. Analyze the student's problem-solving approach using NYS Regents scoring guidelines for that subject
4. Score using the NYS Regents 0-4 rubric and convert to 55-100 scale
5. Identify any misconceptions or errors in the student's reasoning - cite the exact work showing this
6. Provide constructive, standards-aligned feedback based only on observed work

${regentsContext}
${customRubricContext}
${standardContext}

SUBJECT-SPECIFIC NYS STANDARDS GUIDE:
- MATH (Geometry): G.CO.*, G.SRT.*, G.C.*, G.GPE.*, G.GMD.*, G.MG.*
- MATH (Algebra I): A.SSE.*, A.APR.*, A.CED.*, A.REI.*, F.IF.*, F.BF.*, F.LE.*
- MATH (Algebra II): A.SSE.*, A.APR.*, F.IF.*, F.BF.*, F.TF.*, N.CN.*, S.IC.*, S.CP.*
- SCIENCE (Biology): LS1.*, LS2.*, LS3.*, LS4.*
- SCIENCE (Chemistry): PS1.*, PS2.*, PS3.*
- SCIENCE (Physics): PS2.*, PS3.*, PS4.*
- ENGLISH: RL.*, RI.*, W.*, SL.*, L.*
- HISTORY/SS: RH.*, WHST.*, SS.*
- FINANCIAL MATH: NGPF.*, FIN.*

CRITICAL: Detect the subject from the content and use the appropriate standard prefixes.
If you cannot clearly read something, make your best interpretation but flag it with "[INTERPRETATION - VERIFY: ...]" for teacher review.`;

      userPromptText = `Please analyze this student's work using NYS Regents scoring standards.

IMPORTANT: First IDENTIFY THE SUBJECT AREA from the content, then apply appropriate NYS standards.

Extract all text and content you can see (OCR).
Detect the subject area, identify the problem being solved, its related NYS standard, and evaluate the student's approach.`;
    }

    if (rubricSteps && rubricSteps.length > 0) {
      userPromptText += `\n\nTeacher's Rubric Criteria (score each and align to NYS standards):\n`;
      rubricSteps.forEach((step: { step_number: number; description: string; points: number }, i: number) => {
        userPromptText += `${i + 1}. ${step.description} (${step.points} points)\n`;
      });
    }

    userPromptText += `\n\nIMPORTANT - BALANCED GRADING PROTOCOL:

** MANDATORY: READ THE QUESTION 3 TIMES **
Before grading, confirm:
1. What EXACTLY does the question ask for?
2. Does it ask for the FULL answer or just a PART?
3. Only grade what the question ACTUALLY asks - do not penalize for work not requested!

*** MANDATORY 6-ZONE PRE-SCAN FOR BLANK PAGE DETECTION ***
Before any grading, you MUST scan these 6 zones with a 2-3 inch mental radius around each:
1. TOP-LEFT: Check margins, corners, any stray work
2. TOP-RIGHT: Check margins, problem setup area
3. MIDDLE-LEFT: Check "WORK AREA" label zone and left margin
4. MIDDLE-RIGHT: Check center of work area and right margin
5. BOTTOM-LEFT: Check bottom of work area, answer box start
6. BOTTOM-RIGHT: Check "ANSWER" box, final answer area

For EACH zone, report: ZONE [1-6]: [EMPTY/HANDWRITING FOUND: brief description]
If ANY zone has handwriting = Student Work Present = YES

STEP 0 - FULL PAGE SCAN (CRITICAL):
1. Scan the ENTIRE page - all four corners, margins, headers, blank spaces
2. Look for student work ANYWHERE on the page (not just under answer lines)
3. Work written in margins, corners, or near diagrams COUNTS as showing work
4. A calculation like "8x4=32" in the corner IS showing work for area calculation
5. DO NOT mark students down for "not showing work" if work exists ANYWHERE on page
6. *** BLANK PAGE = ALL 6 ZONES ARE EMPTY with ZERO handwriting ***

STEP 1 - EVIDENCE COLLECTION (with smart interpretation):
1. Extract all text/equations from ALL AREAS of the student's work
2. For unclear portions, interpret what student likely meant using context
3. Mark interpretations with "[INTERPRETATION - VERIFY: X]" so teacher can confirm
4. Consider mathematical context - give students benefit of the doubt

STEP 2 - CONCEPT-BASED GRADING (cite your sources):
1. Identify ALL concepts the student demonstrates - cite the specific work showing each
2. Look for COHERENT work that shows logical thinking (even if basic)
3. ANY understanding shown = minimum grade of 65
4. 55 is ONLY for completely blank/no work at all (ALL 6 zones empty)
5. More concepts understood with coherent justification = higher grade

STEP 3 - FLAG FOR TEACHER VERIFICATION:
1. Mark any significant interpretations with "[INTERPRETATION - VERIFY: ...]"
2. For unclear/ambiguous work, provide your best interpretation BUT flag it
3. Teacher will review and confirm flagged items

Provide your analysis in the following structure:
*** START WITH ZONE SCAN ***
- Zone Scan Results: (REQUIRED - Report each zone)
  ZONE 1 (TOP-LEFT): [EMPTY or HANDWRITING: description]
  ZONE 2 (TOP-RIGHT): [EMPTY or HANDWRITING: description]
  ZONE 3 (MIDDLE-LEFT): [EMPTY or HANDWRITING: description]
  ZONE 4 (MIDDLE-RIGHT): [EMPTY or HANDWRITING: description]
  ZONE 5 (BOTTOM-LEFT): [EMPTY or HANDWRITING: description]
  ZONE 6 (BOTTOM-RIGHT): [EMPTY or HANDWRITING: description]
  
- Detected Subject: (the subject area you identified from the content: Geometry, Algebra I, Algebra II, Biology, Chemistry, Physics, English, History, Financial Math, or Other)
- OCR Text: (extracted content - include interpretations marked as "[INTERPRETATION - VERIFY: probable reading is X]")
- Interpretations Made: (LIST any interpretations that need teacher verification)
- Problem Identified: (what problem the student is solving - BRIEF description only, under 20 words)
- NYS Standard: (CONCISE format ONLY: "[CODE] - [Brief 5-10 word description]". Example: "6.G.A.1 - Finding area of composite shapes". Use subject-appropriate standard prefix. Do NOT include full standard text or long explanations.)` + (isAIMode ? `
- Correct Solution: (your step-by-step solution to the problem)` : '') + `
- Concepts Demonstrated: (LIST each concept with citation from their work)
- Student Work Present: (YES or NO - 
    *** CRITICAL: BASE THIS ON YOUR 6-ZONE SCAN ABOVE ***
    
    If ANY of the 6 zones contains HANDWRITING = Answer YES
    
    Answer YES if you found ANY of the following in ANY zone:
    - Handwritten numbers, letters, equations, words, or symbols (even messy or hard to read)
    - Mathematical expressions, calculations, or formulas
    - Student responses in work areas, answer boxes, margins
    - Drawings, diagrams, graphs, or geometric constructions
    
    Answer NO ONLY if ALL 6 ZONES are completely EMPTY:
    - All zones show only printed text or blank white space
    - Zero handwriting detected in any zone
    - No student responses anywhere on the page
    
    *** IF EVEN ONE ZONE HAS HANDWRITING = YES ***)
- Coherent Work Shown: (YES or NO - does the student show logical thinking/work, even if simple? Only relevant if Student Work Present = YES)
- Approach Analysis: (evaluation of their method - focus on what they UNDERSTAND. If Student Work Present = NO, state "No student work to analyze")
- Is Correct: (YES or NO - is the final answer correct? If no answer written, answer NO)
- Final Answer Complete: (YES or NO - did student provide a clear, complete final answer? NO if work stops without conclusion, answer is unsimplified when simplification was required, or no boxed/circled/stated final answer)
- Regents Score: (0, 1, 2, 3, or 4 - 
    *** CRITICAL: If Student Work Present = NO, Regents Score MUST be 0 ***
    A blank page with no student work = Score 0 = Grade 55
    Do NOT give score 1+ for blank pages just because there are "no errors"
    No work = no understanding demonstrated = Score 0)
- Regents Score Justification: (why this score - cite evidence)
- Rubric Scores: (if teacher rubric provided, score each criterion with points)
- Strengths Analysis: (DETAILED - List SPECIFIC things the student is doing RIGHT. For each strength, cite the evidence from their work.
    FORMAT each strength as a complete sentence:
    "STRENGTH: [What the student did correctly]. EVIDENCE: [Exact quote or reference from their work showing this]."
    
    Examples of good strengths:
    ✓ "STRENGTH: Student correctly identified the formula for area of a circle (A = πr²). EVIDENCE: Student wrote 'A = π(5)²' showing correct formula application."
    ✓ "STRENGTH: Student set up the problem correctly by identifying all given information. EVIDENCE: Student listed 'r = 10, h = 5' at the top of their work."
    ✓ "STRENGTH: Student showed clear step-by-step work with logical progression. EVIDENCE: Work flows from equation setup through substitution to simplification."
    
    RULES:
    - List AT LEAST 2 strengths if ANY work is present (even partial work has something positive)
    - Be SPECIFIC - don't just say "good effort", explain WHAT was good
    - If the answer is correct, that should be the FIRST strength listed
    - Credit correct formulas, proper notation, logical reasoning, good organization, correct intermediate steps
    - If work is minimal, still find positives: "attempted the problem", "identified the correct operation", etc.
    - If page is blank, write "No student work present to evaluate.")
- Areas for Improvement: (DETAILED - List SPECIFIC things the student needs to work on. For each area, explain WHY it's wrong and HOW to fix it.
    FORMAT each area as a complete, educational explanation:
    "AREA: [What the student got wrong or needs to improve]. WHY: [Explanation of why this is incorrect or incomplete]. FIX: [Clear explanation of the correct approach or what to do differently]."
    
    Examples of good improvement areas:
    ✓ "AREA: Student used the wrong formula for circumference (used A = πr² instead of C = 2πr). WHY: Area and circumference are different measurements - area measures the space inside the circle while circumference measures the distance around it. FIX: For circumference, use C = 2πr or C = πd."
    ✓ "AREA: Student made an arithmetic error in the final calculation (wrote 3 × 8 = 21). WHY: This multiplication error carried through to the final answer, making it incorrect. FIX: 3 × 8 = 24. Double-check multiplication by using repeated addition: 8 + 8 + 8 = 24."
    ✓ "AREA: Student did not show work for the intermediate steps. WHY: Without shown work, partial credit cannot be awarded if the answer is wrong, and the teacher cannot identify where understanding breaks down. FIX: Write out each step of the calculation, even if it seems obvious."
    
    RULES:
    - For EACH error, explain WHY it's wrong and provide the CORRECT approach (the FIX)
    - Be EDUCATIONAL - the goal is to help the student learn, not just identify mistakes
    - Include the correct method/formula/approach so the student can learn from this
    - If the answer is correct but work is minimal, suggest showing more work for full credit
    - If the student's work is completely correct, write "No areas for improvement identified - excellent work!"
    - If page is blank, write "Student needs to attempt the problem. Start by identifying what the question is asking and what information is given.")
- Misconceptions: (CRITICAL - ONLY list VERIFIED ERRORS that you can directly quote from the student's work.
    
    *** ANTI-HALLUCINATION RULES FOR ERROR REPORTING ***
    BEFORE reporting ANY error, you MUST:
    1. QUOTE EXACTLY what the student wrote - copy their actual handwritten text/numbers character by character
    2. VERIFY the quote exists in the OCR text you extracted above
    3. If you cannot DIRECTLY QUOTE the error from the student's work, DO NOT REPORT IT
    4. NEVER report errors based on what you THINK the student might have done
    5. NEVER fabricate mathematical expressions that don't appear in the image
    6. If the student's work is CORRECT, write "No errors found - work is mathematically correct"
    
    *** CORRECT ANSWER = NO ERRORS ***
    If the student arrives at the CORRECT FINAL ANSWER:
    - Their work is fundamentally correct
    - Minor notation differences are NOT errors (e.g., writing "12.5π" vs "12.5π sq ft")
    - DO NOT report "errors" for correct mathematical work
    - Only report genuine mathematical mistakes that happen to still lead to correct answer (rare)
    
    FORMAT - Start with the ERROR first, then explain:
    "ERROR_LOCATION: [top/middle/bottom]-[left/center/right] | [EXACT QUOTE FROM WORK]: '[paste exact text here]'. [ERROR]: This is incorrect because [explanation]. [CORRECT]: The right approach is [expected]."
    
    CRITICAL VALIDATION RULES:
    1. The EXACT QUOTE must appear in your OCR extraction above - if it doesn't, the error is fabricated
    2. ERRORS ONLY - Never mention strengths, correct work, or what student did right in this section
    3. ERROR FIRST - Always state the error/mistake at the beginning of each entry
    4. START with "ERROR_LOCATION: [position]" format: "top-left", "middle-center", "bottom-right"
    5. EXPLAIN why this is mathematically wrong
    6. STATE the impact on the final answer
    7. Write COMPLETE sentences - no fragments
    8. Separate entry for each distinct error
    9. If NO errors exist, explicitly state "No errors found"
    
    CORRECT EXAMPLES:
    ✓ "ERROR_LOCATION: top-right | [EXACT QUOTE]: 'A = πr'. [ERROR]: Student omitted the exponent - formula should be A = πr². This caused the area calculation to be wrong."
    ✓ "No errors found - the student's work is mathematically correct and leads to the right answer of 12.5π."
    
    WRONG EXAMPLES (NEVER DO THIS):
    ✗ Reporting an error for work that leads to the correct answer
    ✗ Reporting an error you cannot directly quote from the OCR text
    ✗ "The student wrote '$\\sqrt{60}\\pi$'" - if this doesn't appear in OCR, it's fabricated
    ✗ Inventing expressions the student never wrote)
- Needs Teacher Review: (list items flagged for verification)
- Total Score: (IMPORTANT: This is points from teacher rubric criteria ONLY. If no teacher rubric was provided, use the Regents score converted: Score 4=4/4, Score 3=3/4, Score 2=2/4, Score 1=1/4, Score 0=0/4. Format: earned/possible)
- Standards Met: (YES or NO - does work show ANY understanding of the standards?)
- Grade: (55-100 scale. YOUR GRADE MUST MATCH YOUR OWN EVIDENCE.
    *** GRADE CONSISTENCY RULE - CRITICAL ***
    Your grade MUST be logically consistent with your error analysis:
    - If you found NO errors and work is present → Grade MUST be 90-100
    - If you found only MINOR errors → Grade MUST be 80-90
    - If you found SIGNIFICANT errors but student shows partial understanding → Grade 65-79
    - If work is blank/no understanding → Grade 55
    
    NEVER give a low grade (below 90) while simultaneously saying "no errors found" or "work is mathematically correct."
    NEVER give a high grade (above 90) while listing multiple significant errors.
    
    Scale:
    • 95-100 = Full mastery, no errors, complete and correct work
    • 90-94 = Strong understanding, no mathematical errors but minor presentation issues
    • 75-84 = Good understanding with some errors
    • 65-74 = Partial understanding with significant gaps
    • 55-64 = Minimal or no understanding shown)
` + (feedbackVerbosity === 'detailed' ? `
- Grade Justification: (DETAILED - 150-200 words. MUST directly quote the student's written work using "Student wrote: '[exact quote]'" format. Structure:
    POINTS EARNED: For each concept the student demonstrates, quote their work: "Student wrote: '[exact quote]' — this shows understanding of [concept] (+X points)."
    POINTS DEDUCTED: For each error, quote their work: "Student wrote: '[exact quote]' — this is incorrect because [reason] (-X points)."
    FINAL CALCULATION: "Starting from 100, earned [X] for [concepts], deducted [Y] for [errors] = Grade [Z]."
    Every claim must reference specific student writing.)
- What Student Did Correctly: (REQUIRED - 50-100 words. MUST directly quote the student's actual written equations, steps, or reasoning. Format: "Student correctly wrote '[exact equation/step from their paper]' which shows [concept]. They also demonstrated [skill] by writing '[another exact quote]'." If nothing is correct, say "No correct work identified.")
- What Student Got Wrong: (REQUIRED - 50-100 words. MUST directly quote the student's actual errors. Format: "Student wrote '[exact incorrect equation/step]' but the correct approach is [correct method]. This error in their work '[quote]' shows [misconception]." Explain WHY each quoted error is wrong. If no errors, say "No errors found - work is correct.")
- Feedback: (DETAILED - 100-150 words. Provide comprehensive suggestions for improvement including: specific practice topics, common pitfalls to avoid, study strategies, and encouragement. Be constructive and educational.)` : `
- Grade Justification: (75-120 words. Format: "STRENGTHS: [what was correct and why it shows understanding]. DEDUCTIONS: [specific errors with brief explanation]. RESULT: [final reasoning for grade]")
- Feedback: (60-100 words. Include: 1) One specific thing the student did well, 2) One specific area to practice, 3) A concrete next step for improvement. Be constructive and encouraging.)`) + `\``;

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

    // Use the STANDARD tier model for main grading - provides much better
    // detailed analysis (strengths, areas for improvement, educational feedback)
    // compared to the lite model used for simpler tasks like OCR/blank detection.
    // The teacher's analysisProvider setting controls which model is used:
    // - 'gemini' → Gemini 2.5 Flash (default, fast, affordable)
    // - 'gpt4o'  → GPT-4o (best handwriting OCR + analysis quality, higher cost)
    // - 'gpt4o-mini' → GPT-4o Mini (better OCR than Gemini, similar cost)
    const analysisText = await callLovableAI(
      messages, 
      LOVABLE_API_KEY, 
      'analyze-student-work', 
      supabase, 
      effectiveTeacherId, 
      'standard',
      analysisProvider
    );

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

  const content = await callLovableAI(messages, apiKey, 'compare-with-solution', undefined, undefined, 'standard');
  
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
  parsedQRCode: { studentId: string; questionId?: string; version?: number; pageNumber?: number; totalPages?: number } | null;
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

const prompt = `Analyze this image of student work to identify the student. CRITICAL: Look carefully for QR codes AND the printed student name!

1. QR CODE: Check ALL corners and edges thoroughly for any QR code. Scan the ENTIRE image carefully.
   - QR codes are typically small black-and-white square patterns, often in BOTH top corners
   - VERSION 1 FORMAT: {"v":1,"s":"student-uuid","q":"question-uuid"} - contains student AND question IDs
   - VERSION 2 FORMAT: {"v":2,"type":"student","s":"student-uuid"} - contains ONLY student ID
   - VERSION 3 FORMAT: {"v":3,"type":"student-page","s":"student-uuid","p":1,"t":2} - contains student ID + page number
   - If you find a QR code, extract its EXACT content character-by-character
   - The "s" field contains the student UUID that MUST match the roster
   
2. PRINTED/TYPED STUDENT NAME: Look for a PRINTED name at the top of the page (not handwritten).
   - Worksheets often have the student name printed in the center-top header
   - Look for patterns like "StudentName - Level X" or just "FirstName LastName" centered at top
   - Look for labels like "Student Name", "Name:", or "Student:" and read the text immediately following
   - Ignore printed questions/directions when extracting the name
   - This is often BOLD and clearly visible
   
3. HANDWRITTEN NAME: Also look for any handwritten student name (especially on a "Name:" line).
4. STUDENT ID: Look for any printed or handwritten student ID number.
${rosterInfo}

IMPORTANT MATCHING RULES:
- If you find a QR code with an "s" field, that UUID must EXACTLY match an "id" from the roster
- The roster IDs are UUIDs like "a1b2c3d4-e5f6-..." - match against these, NOT student_id numbers
- QR code match = "high" confidence always
- PRINTED NAME at top of worksheet should be treated as "high" confidence if it exactly matches a roster name

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "qr_code_detected": true/false,
  "qr_code_content": "exact JSON content if found or null",
  "qr_code_version": 1 or 2 or 3 or null,
  "handwritten_name": "extracted name or null",
  "printed_name": "printed name at top if found or null",
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
      
      let parsedQRCode: { studentId: string; questionId?: string; version: number; pageNumber?: number; totalPages?: number } | null = null;
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
            matchedQuestionId = qrData.q;
            
            // Only set matchedId if student exists in roster
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedId = qrData.s;
                matchedName = `${student.first_name} ${student.last_name}`;
                console.log('Parsed v1 QR code matched to roster:', matchedName);
              } else {
                console.log('v1 QR code student ID not in roster, will fall back to name matching:', qrData.s);
              }
            }
          }
          // Version 2: Student-only QR code
          else if (qrData.v === 2 && qrData.type === 'student' && qrData.s) {
            parsedQRCode = {
              studentId: qrData.s,
              version: 2,
            };
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedId = qrData.s;
                matchedName = `${student.first_name} ${student.last_name}`;
                console.log('Parsed v2 QR code matched to roster:', matchedName);
              } else {
                console.log('v2 QR code student ID not in roster, will fall back to name matching:', qrData.s);
              }
            }
          }
          // Version 3: Student + Page QR code (for multi-page worksheets)
          else if (qrData.v === 3 && qrData.type === 'student-page' && qrData.s) {
            parsedQRCode = {
              studentId: qrData.s,
              version: 3,
              pageNumber: qrData.p,
              totalPages: qrData.t,
            };
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedId = qrData.s;
                matchedName = `${student.first_name} ${student.last_name}`;
                console.log('Parsed v3 QR code matched to roster:', matchedName);
              } else {
                console.log('v3 QR code student ID not in roster, will fall back to name matching:', qrData.s);
              }
            }
          }
          // Fallback: Try to extract student ID from any "s" field
          else if (qrData.s) {
            parsedQRCode = {
              studentId: qrData.s,
              questionId: qrData.q,
              version: qrData.v || 0,
            };
            if (qrData.q) matchedQuestionId = qrData.q;
            
            if (studentRoster && studentRoster.length > 0) {
              const student = studentRoster.find(s => s.id === qrData.s);
              if (student) {
                matchedId = qrData.s;
                matchedName = `${student.first_name} ${student.last_name}`;
                console.log('Parsed generic QR code matched to roster:', matchedName);
              } else {
                console.log('Generic QR code student ID not in roster, will fall back to name matching:', qrData.s);
              }
            }
          } else {
            console.log('QR code parsed but no student ID ("s" field) found:', qrData);
          }
        } catch (qrParseError) {
          console.log('QR content is not valid JSON (likely AI hallucination), ignoring:', parsed.qr_code_content);
        }
      }
      
      // CRITICAL FIX: If AI reported a matched_student_id, verify it exists in roster
      // AI vision models often hallucinate UUIDs that look plausible but don't match anyone
      if (matchedId && studentRoster && studentRoster.length > 0) {
        const verifiedStudent = studentRoster.find(s => s.id === matchedId);
        if (!verifiedStudent) {
          console.log('AI-reported matched_student_id not found in roster, clearing:', matchedId);
          matchedId = null;
          matchedName = null;
        }
      }
      
      // Try printed name first (high confidence for worksheet headers)
      if (!matchedId && parsed.printed_name && studentRoster && studentRoster.length > 0) {
        console.log('Trying to match printed name:', parsed.printed_name);
        const match = fuzzyMatchStudent(parsed.printed_name, studentRoster);
        if (match) {
          matchedId = match.id;
          matchedName = `${match.first_name} ${match.last_name}`;
          console.log('Matched printed name to student:', matchedName);
        }
      }
      
      // Fall back to handwritten name
      if (!matchedId && parsed.handwritten_name && studentRoster && studentRoster.length > 0) {
        console.log('Trying to match handwritten name:', parsed.handwritten_name);
        const match = fuzzyMatchStudent(parsed.handwritten_name, studentRoster);
        if (match) {
          matchedId = match.id;
          matchedName = `${match.first_name} ${match.last_name}`;
          console.log('Matched handwritten name to student:', matchedName);
        }
      }
      
      // Also try student_id_found field if present (numeric student IDs)
      if (!matchedId && parsed.student_id_found && studentRoster && studentRoster.length > 0) {
        console.log('Trying to match student_id_found:', parsed.student_id_found);
        const match = studentRoster.find(s => s.student_id === parsed.student_id_found);
        if (match) {
          matchedId = match.id;
          matchedName = `${match.first_name} ${match.last_name}`;
          console.log('Matched student ID number to student:', matchedName);
        }
      }
      
      // Determine confidence based on how we matched
      let finalConfidence: 'high' | 'medium' | 'low' | 'none' = 'none';
      if (matchedId) {
        if (parsedQRCode && studentRoster?.find(s => s.id === parsedQRCode!.studentId)) {
          finalConfidence = 'high'; // QR code matched to roster
        } else if (parsed.printed_name) {
          finalConfidence = 'high'; // Printed name is reliable
        } else if (parsed.handwritten_name) {
          finalConfidence = parsed.confidence === 'high' ? 'medium' : (parsed.confidence || 'low');
        } else {
          finalConfidence = parsed.confidence || 'medium';
        }
      }
      
      return {
        qrCodeDetected: parsed.qr_code_detected || false,
        qrCodeContent: parsed.qr_code_content || null,
        parsedQRCode,
        handwrittenName: parsed.handwritten_name || parsed.printed_name || null,
        matchedStudentId: matchedId || null,
        matchedStudentName: matchedName || null,
        matchedQuestionId,
        confidence: finalConfidence,
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
  
  // Remove common prefixes/suffixes that might appear on papers
  const cleanedInput = normalizedInput
    .replace(/^(name|student|by|written by|from)[:\s]*/i, '')
    .replace(/\s*(period|class|date|pd)[\s\d:]*$/i, '')
    .trim();
  
  console.log('Fuzzy matching input:', { original: name, normalized: normalizedInput, cleaned: cleanedInput });
  
  // 1. Exact match (full name or reversed)
  for (const student of roster) {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const reverseName = `${student.last_name} ${student.first_name}`.toLowerCase();
    
    if (fullName === cleanedInput || reverseName === cleanedInput) {
      console.log('Exact match found:', student);
      return student;
    }
  }
  
  // 2. First name only match (common when students write just first name)
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    if (cleanedInput === firstName && firstName.length >= 3) {
      console.log('First name only match:', student);
      return student;
    }
  }
  
  // 3. Last name only match
  for (const student of roster) {
    const lastName = student.last_name.toLowerCase();
    if (cleanedInput === lastName && lastName.length >= 3) {
      console.log('Last name only match:', student);
      return student;
    }
  }
  
  // 4. Partial containment (both names present in any order)
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    const lastName = student.last_name.toLowerCase();
    
    // Both first and last name must appear in the input
    if (firstName.length >= 2 && lastName.length >= 2 &&
        cleanedInput.includes(firstName) && cleanedInput.includes(lastName)) {
      console.log('Containment match:', student);
      return student;
    }
    
    // Check if input ends/starts with last name (common pattern: "John S" for "John Smith")
    // Only match if the last name is long enough to be meaningful (>= 3 chars)
    if (lastName.length >= 3 && (cleanedInput.endsWith(lastName) || cleanedInput.startsWith(lastName))) {
      console.log('Ends/starts with last name match:', student);
      return student;
    }
  }
  
  // 5. Initial-based matching (e.g., "J. Smith" or "John S.")
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    const lastName = student.last_name.toLowerCase();
    const firstInitial = firstName[0];
    const lastInitial = lastName[0];
    
    // "J. Smith" or "J Smith" pattern
    const initialLastPattern = new RegExp(`^${firstInitial}\\.?\\s*${lastName}$`, 'i');
    if (initialLastPattern.test(cleanedInput)) {
      console.log('Initial + last name match:', student);
      return student;
    }
    
    // "John S." or "John S" pattern
    const firstInitialPattern = new RegExp(`^${firstName}\\s+${lastInitial}\\.?$`, 'i');
    if (firstInitialPattern.test(cleanedInput)) {
      console.log('First + initial match:', student);
      return student;
    }
  }
  
  // 6. Nickname matching (common nicknames)
  const nicknameMap: Record<string, string[]> = {
    'william': ['will', 'bill', 'billy', 'willy', 'liam'],
    'robert': ['rob', 'bob', 'bobby', 'robbie'],
    'richard': ['rick', 'rich', 'dick', 'ricky'],
    'james': ['jim', 'jimmy', 'jamie'],
    'michael': ['mike', 'mikey', 'mick'],
    'christopher': ['chris', 'topher'],
    'matthew': ['matt', 'matty'],
    'jennifer': ['jen', 'jenny', 'jenn'],
    'elizabeth': ['liz', 'lizzy', 'beth', 'betty', 'eliza'],
    'katherine': ['kate', 'katy', 'katie', 'kat', 'kathy'],
    'margaret': ['maggie', 'meg', 'peggy', 'marge'],
    'nicholas': ['nick', 'nicky'],
    'alexander': ['alex', 'xander'],
    'benjamin': ['ben', 'benny', 'benji'],
    'jonathan': ['jon', 'john', 'johnny'],
    'anthony': ['tony', 'ant'],
    'joseph': ['joe', 'joey'],
    'samuel': ['sam', 'sammy'],
    'daniel': ['dan', 'danny'],
    'david': ['dave', 'davey'],
    'thomas': ['tom', 'tommy'],
    'edward': ['ed', 'eddie', 'ted', 'teddy'],
    'andrew': ['andy', 'drew'],
    'joshua': ['josh'],
    'stephanie': ['steph', 'stephie'],
    'victoria': ['vicky', 'vic', 'tori'],
    'samantha': ['sam', 'sammy'],
    'alexandra': ['alex', 'lexi'],
    'abigail': ['abby', 'gail'],
    'madeline': ['maddy', 'maddie'],
    'olivia': ['liv', 'livvy'],
    'natalie': ['nat', 'natty'],
    'rebecca': ['becca', 'becky'],
    'theodore': ['ted', 'teddy', 'theo'],
  };
  
  for (const student of roster) {
    const firstName = student.first_name.toLowerCase();
    const lastName = student.last_name.toLowerCase();
    
    // Check if input matches a nickname
    for (const [formal, nicknames] of Object.entries(nicknameMap)) {
      if (firstName === formal) {
        for (const nickname of nicknames) {
          if (cleanedInput === nickname || 
              cleanedInput === `${nickname} ${lastName}` ||
              cleanedInput === `${lastName} ${nickname}`) {
            console.log('Nickname match:', student, 'via', nickname);
            return student;
          }
        }
      }
      // Also check reverse: student has nickname, input has formal name
      if (nicknames.includes(firstName)) {
        if (cleanedInput === formal ||
            cleanedInput === `${formal} ${lastName}` ||
            cleanedInput === `${lastName} ${formal}`) {
          console.log('Reverse nickname match:', student, 'via', formal);
          return student;
        }
      }
    }
  }
  
  // 7. Fuzzy similarity matching with LOWER threshold (0.5 instead of 0.6)
  let bestMatch: StudentRosterItem | null = null;
  let bestScore = 0;
  
  for (const student of roster) {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const reverseName = `${student.last_name} ${student.first_name}`.toLowerCase();
    
    const score1 = calculateSimilarity(cleanedInput, fullName);
    const score2 = calculateSimilarity(cleanedInput, reverseName);
    const score = Math.max(score1, score2);
    
    if (score > bestScore && score > 0.5) { // Lowered threshold from 0.6 to 0.5
      bestScore = score;
      bestMatch = student;
    }
  }
  
  if (bestMatch) {
    console.log('Fuzzy match found:', bestMatch, 'with score:', bestScore);
  } else {
    console.log('No match found for:', cleanedInput);
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
  detectedSubject: string;
  ocrText: string;
  problemIdentified: string;
  nysStandard: string;
  conceptsDemonstrated: string[];
  studentWorkPresent: boolean; // NEW: Explicit blank page detection
  coherentWorkShown: boolean;
  approachAnalysis: string;
  strengthsAnalysis: string[]; // Detailed list of what student did right
  areasForImprovement: string[]; // Detailed list of what student needs to work on
  rubricScores: { criterion: string; score: number; maxScore: number; feedback: string }[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  regentsScore: number;
  regentsScoreJustification: string;
  grade: number;
  gradeJustification: string;
  feedback: string;
  isAnswerCorrect: boolean;
  finalAnswerComplete: boolean;
}

function parseAnalysisResult(text: string, rubricSteps?: any[], gradeFloor: number = 55, gradeFloorWithEffort: number = 65): ParsedResult {
  const result: ParsedResult = {
    detectedSubject: '',
    ocrText: '',
    problemIdentified: '',
    nysStandard: '',
    conceptsDemonstrated: [],
    studentWorkPresent: true, // Default to true, set to false if detected as blank
    coherentWorkShown: false,
    approachAnalysis: '',
    strengthsAnalysis: [],
    areasForImprovement: [],
    rubricScores: [],
    misconceptions: [],
    totalScore: { earned: 0, possible: 0, percentage: 0 },
    regentsScore: 0,
    regentsScoreJustification: '',
    grade: gradeFloorWithEffort, // Default to effort floor - most scans have SOME work
    gradeJustification: '',
    feedback: '',
    isAnswerCorrect: false,
    finalAnswerComplete: true, // Default to true, set to false if detected
  };

  // Parse Detected Subject
  const subjectMatch = text.match(/Detected Subject[:\s]*([^\n]+)/i);
  if (subjectMatch) result.detectedSubject = subjectMatch[1].trim();

  const ocrMatch = text.match(/OCR Text[:\s]*([^]*?)(?=Interpretations Made|Problem Identified|NYS Standard|Concepts Demonstrated|Approach Analysis|$)/i);
  if (ocrMatch) result.ocrText = ocrMatch[1].trim();

  const problemMatch = text.match(/Problem Identified[:\s]*([^]*?)(?=NYS Standard|Concepts Demonstrated|Approach Analysis|Rubric Scores|$)/i);
  if (problemMatch) result.problemIdentified = problemMatch[1].trim();

  // Parse NYS Standard
  const standardMatch = text.match(/NYS Standard[:\s]*([^]*?)(?=Correct Solution|Concepts Demonstrated|Approach Analysis|$)/i);
  if (standardMatch) result.nysStandard = standardMatch[1].trim();

  // Parse Concepts Demonstrated - KEY for concept-based grading
  const conceptsMatch = text.match(/Concepts Demonstrated[:\s]*([^]*?)(?=Student Work Present|Coherent Work|Approach Analysis|Is Correct|$)/i);
  if (conceptsMatch) {
    const conceptsText = conceptsMatch[1].trim();
    result.conceptsDemonstrated = conceptsText
      .split(/[-•\n,;]/)
      .map(c => c.trim())
      .filter(c => c.length > 2 && !c.match(/^(none|n\/a|no concepts?)$/i));
  }

  // *** CRITICAL: Parse Zone Scan Results for more reliable blank page detection ***
  const zoneScanMatch = text.match(/Zone Scan Results[:\s]*([^]*?)(?=Detected Subject|OCR Text|$)/i);
  let zonesWithHandwriting = 0;
  let zonesScanned = 0;
  if (zoneScanMatch) {
    const zoneScanText = zoneScanMatch[1].toLowerCase();
    const zoneCountMatches = zoneScanText.match(/zone\s*\d/gi);
    zonesScanned = zoneCountMatches ? zoneCountMatches.length : 0;
    // Count zones that have HANDWRITING
    const zoneMatches = zoneScanText.match(/zone \d[^:]*:[^\n]*(handwriting|found|has|contains|shows|wrote|written)/gi);
    zonesWithHandwriting = zoneMatches ? zoneMatches.length : 0;
    console.log(`Zone scan detected ${zonesWithHandwriting} zones with handwriting (zones scanned: ${zonesScanned})`);
  }

  // *** CRITICAL: Parse Student Work Present - Use ZONE SCAN + explicit detection ***
  // DEFAULT TO TRUE - only set to false if AI EXPLICITLY says NO AND zone scan confirms all zones empty
  const studentWorkMatch = text.match(/Student Work Present[:\s]*(YES|NO)/i);
  
  // If zone scan found handwriting in ANY zone, override to YES
  if (zonesWithHandwriting > 0) {
    result.studentWorkPresent = true;
    console.log('Zone scan detected handwriting - overriding studentWorkPresent to TRUE');
  } else if (zonesScanned >= 4) {
    // If the zone scan ran and found no handwriting in multiple zones, treat as blank
    result.studentWorkPresent = false;
    console.log('Zone scan found no handwriting across zones - overriding studentWorkPresent to FALSE');
  } else {
    // Only mark as no work if there's an EXPLICIT "NO" - anything else defaults to work present
    result.studentWorkPresent = studentWorkMatch && studentWorkMatch[1].toUpperCase() === 'NO' ? false : true;
  }

  // Parse Coherent Work Shown
  const coherentMatch = text.match(/Coherent Work Shown[:\s]*(YES|NO)/i);
  result.coherentWorkShown = coherentMatch ? coherentMatch[1].toUpperCase() === 'YES' : false;

  // Parse Is Correct (final answer correctness)
  const isCorrectMatch = text.match(/Is Correct[:\s]*(YES|NO)/i);
  result.isAnswerCorrect = isCorrectMatch ? isCorrectMatch[1].toUpperCase() === 'YES' : false;

  // Parse Final Answer Complete
  const finalAnswerCompleteMatch = text.match(/Final Answer Complete[:\s]*(YES|NO)/i);
  result.finalAnswerComplete = finalAnswerCompleteMatch ? finalAnswerCompleteMatch[1].toUpperCase() === 'YES' : true;

  const approachMatch = text.match(/Approach Analysis[:\s]*([^]*?)(?=Is Correct|Final Answer Complete|Strengths Analysis|Regents Score|Rubric Scores|Misconceptions|$)/i);
  if (approachMatch) result.approachAnalysis = approachMatch[1].trim();

  // Parse Strengths Analysis - what student did right
  const strengthsMatch = text.match(/Strengths Analysis[:\s]*([^]*?)(?=Areas for Improvement|Misconceptions|Total Score|Regents Score|$)/i);
  if (strengthsMatch) {
    const strengthsText = strengthsMatch[1].trim();
    result.strengthsAnalysis = strengthsText
      .split(/\n/)
      .map(s => s.replace(/^[-•*✓]\s*/, '').trim())
      .filter(s => {
        // Filter out empty/placeholder entries
        const isLongEnough = s.length >= 15;
        const isNotNone = !s.match(/^(none|n\/a|no strengths?|no student work)$/i);
        return isLongEnough && isNotNone;
      });
  }

  // Parse Areas for Improvement - what student needs to work on
  const areasMatch = text.match(/Areas for Improvement[:\s]*([^]*?)(?=Misconceptions|Total Score|Needs Teacher|Standards Met|Regents Score|$)/i);
  if (areasMatch) {
    const areasText = areasMatch[1].trim();
    result.areasForImprovement = areasText
      .split(/\n/)
      .map(a => a.replace(/^[-•*]\s*/, '').trim())
      .filter(a => {
        // Filter out empty/placeholder entries
        const isLongEnough = a.length >= 15;
        const isNotNone = !a.match(/^(none|n\/a|no areas?|no improvement|excellent work)$/i);
        return isLongEnough && isNotNone;
      });
  }

  // Parse Regents Score (0-4)
  const regentsScoreMatch = text.match(/Regents Score[:\s]*(\d)/i);
  if (regentsScoreMatch) {
    result.regentsScore = Math.min(4, Math.max(0, parseInt(regentsScoreMatch[1])));
  }

  const regentsJustificationMatch = text.match(/Regents Score Justification[:\s]*([^]*?)(?=Rubric Scores|Misconceptions|$)/i);
  if (regentsJustificationMatch) result.regentsScoreJustification = regentsJustificationMatch[1].trim();

  const misconceptionsMatch = text.match(/Misconceptions[:\s]*([^]*?)(?=Needs Teacher|Total Score|Standards Met|Grade Justification|Feedback|$)/i);
  if (misconceptionsMatch) {
    const misconceptionsText = misconceptionsMatch[1].trim();
    // Split on newlines but preserve complete sentences
    // Filter out incomplete fragments (less than 20 chars or missing subject)
    result.misconceptions = misconceptionsText
      .split(/\n/)
      .map(m => m.replace(/^[-•*]\s*/, '').trim())
      .filter(m => {
        // Filter criteria for valid misconceptions:
        // 1. Must be at least 20 characters (complete sentence)
        // 2. Must not be just "none" or "n/a"
        // 3. Should start with a proper subject (The, In, Student, When, etc.) or contain key explanation words
        const isLongEnough = m.length >= 20;
        const isNotNone = !m.match(/^(none|n\/a|no misconceptions?|no errors?)$/i);
        const hasProperStructure = /^(The|In|Student|When|During|For|On|At|While|After|Before|Here|This|Their|A |An )/i.test(m) ||
                                   m.includes('wrote') || m.includes('student') || m.includes('incorrect');
        return isLongEnough && isNotNone && hasProperStructure;
      });
  }

  const scoreMatch = text.match(/Total Score[:\s]*(\d+(?:\.\d+)?)\s*[\/\\]\s*(\d+)/i);
  if (scoreMatch) {
    result.totalScore.earned = parseFloat(scoreMatch[1]);
    result.totalScore.possible = parseFloat(scoreMatch[2]);
    result.totalScore.percentage = result.totalScore.possible > 0 
      ? Math.round((result.totalScore.earned / result.totalScore.possible) * 100) 
      : 0;
  }
  
  // FALLBACK: If no valid totalScore parsed but we have a Regents score, convert it
  // This ensures we always have meaningful score data aligned with Regents rubric
  if (result.totalScore.possible === 0 && result.regentsScore >= 0) {
    // Use 4-point Regents scale when no teacher rubric is provided
    result.totalScore.earned = result.regentsScore;
    result.totalScore.possible = 4;
    result.totalScore.percentage = Math.round((result.regentsScore / 4) * 100);
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
  
  // *** CRITICAL: Check for NO STUDENT WORK explicitly detected by AI ***
  // This is the most reliable indicator - if AI says no work present, it's a blank page
  const noStudentWorkDetected = !result.studentWorkPresent;
  
  // Check if EXPLICITLY marked as blank/no work (secondary check)
  const explicitlyBlank = noStudentWorkDetected || (
    (textLower.includes('blank response') || 
     textLower.includes('completely blank') ||
     textLower.includes('completely empty') ||
     textLower.includes('nothing written') ||
     textLower.includes('no response') ||
     textLower.includes('no student work') ||
     textLower.includes('work areas are empty') ||
     textLower.includes('no work to analyze')) &&
    !textLower.includes('some') &&
    !textLower.includes('attempt'));
  
  // Check for ANY understanding indicators - BUT ONLY IF WORK IS PRESENT
  const hasConceptsDemo = result.studentWorkPresent && result.conceptsDemonstrated.length > 0;
  const hasCoherentWork = result.studentWorkPresent && result.coherentWorkShown;
  // OCR content only counts if student work is present (printed question text doesn't count)
  const hasOcrContent = result.studentWorkPresent && result.ocrText.trim().length > 10;
  const hasPositiveRegents = result.regentsScore >= 1;
  const hasPositiveScore = result.totalScore.earned > 0;
  
  // Look for understanding keywords in the analysis - BUT ONLY IF WORK IS PRESENT
  const showsUnderstanding = result.studentWorkPresent && (
    textLower.includes('understand') ||
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
    textLower.includes('concept'));
  
  // *** CRITICAL: Check for FULL MASTERY / PERFECT SCORE indicators ***
  // If the justification says the student met full standards, got everything correct, etc. -> 100
  // BUT ONLY IF:
  // 1. STUDENT WORK IS ACTUALLY PRESENT (studentWorkPresent = true)
  // 2. There is MEANINGFUL OCR content showing actual student work (not just printed questions)
  // 3. Regents score is 4 (the highest) OR explicit correct answer indicators
  
  // *** CRITICAL: NEVER GIVE 100 TO BLANK PAGES ***
  // A blank page has "no errors" by definition - this does NOT mean full mastery!
  // 100 requires POSITIVE EVIDENCE of mastery, not just absence of errors
  
  // REQUIRE substantial OCR content AND high Regents score for 100
  const hasSubstantialWork = result.ocrText.trim().length >= 30 && result.studentWorkPresent;
  const hasHighRegentsScore = result.regentsScore >= 4;
  const hasCorrectAnswer = result.isAnswerCorrect === true;
  
  // Only these indicators count as POSITIVE evidence of mastery (not absence of errors)
  const positiveMasteryIndicators = [
    'complete and correct',
    'complete mastery',
    'full mastery',
    'all concepts demonstrated',
    'all problems correct',
    'complete understanding',
    'complete solutions',
    'correct solutions for all',
    'correctly applied formulas',
    'correctly executed',
    'demonstrates proficiency',
    'accurately solving',
    'accurate solution',
    'perfectly correct',
    'all correct',
    'fully correct',
    'exceeding standards',
    'exceeds standards',
  ];
  
  // REMOVED from mastery indicators - these DO NOT indicate mastery:
  // 'no errors', 'no discernible error', 'no computational error', 'no conceptual error'
  // A blank page has "no errors" but that doesn't mean the student has mastery!
  
  const textLowerForMastery = textLower;
  const hasPerfectIndicators = hasSubstantialWork && positiveMasteryIndicators.some(indicator => textLowerForMastery.includes(indicator));
  
  // Check the grade justification and regents justification specifically for mastery signals
  const justificationText = (result.gradeJustification + ' ' + result.regentsScoreJustification).toLowerCase();
  const justificationHasMastery = hasSubstantialWork && positiveMasteryIndicators.some(indicator => justificationText.includes(indicator));
  
  // *** STRICT PERFECT SCORE REQUIREMENTS ***
  // 100 requires ALL of these:
  // 1. Student work present (not blank)
  // 2. Substantial OCR content (>=30 chars of actual work)
  // 3. EITHER Regents 4 with correct answer OR explicit mastery language
  const shouldGetPerfectScore = (
    hasSubstantialWork &&
    result.studentWorkPresent &&
    (
      (hasHighRegentsScore && hasCorrectAnswer) ||
      (hasPerfectIndicators || justificationHasMastery)
    )
  );
  
  console.log(`Grade determination - StudentWorkPresent: ${result.studentWorkPresent}, OCR length: ${result.ocrText.trim().length}, Concepts: ${result.conceptsDemonstrated.length}, Coherent: ${hasCoherentWork}, Understanding: ${showsUnderstanding}, Blank: ${explicitlyBlank}, SubstantialWork: ${hasSubstantialWork}, Regents: ${result.regentsScore}, PerfectIndicators: ${shouldGetPerfectScore}`);
  
  // *** CRITICAL: NO STUDENT WORK = GRADE 55, NO EXCEPTIONS ***
  // If student work is not present, there's no understanding to evaluate
  // This cannot be overridden by "no errors" because blank pages have no errors by definition
  if (!result.studentWorkPresent || explicitlyBlank) {
    console.log('NO STUDENT WORK DETECTED - Enforcing grade floor of 55');
    result.grade = gradeFloor;
    result.regentsScore = 0;
    if (!result.gradeJustification.includes('no work')) {
      result.gradeJustification = 'No student work shown on the page. Grade floor applied. ' + result.gradeJustification;
    }
    // Force misconceptions to reflect the blank page
    if (result.misconceptions.length === 0 || result.misconceptions.some(m => m.toLowerCase().includes('no error'))) {
      result.misconceptions = ['No student work was submitted. Work areas are blank.'];
    }
    return result; // Return early - no further grade adjustments needed
  }
  
  // CRITICAL: If ANY understanding is shown (and work IS present), minimum is 65
  const hasAnyUnderstanding = (
    hasConceptsDemo ||
    hasCoherentWork ||
    hasOcrContent ||
    hasPositiveRegents ||
    hasPositiveScore ||
    showsUnderstanding ||
    standardsMet
  );
  
  // *** CORRECT ANSWER + NO ERRORS = HIGH GRADE ***
  const hasNoRealErrors = result.misconceptions.length === 0 || 
    result.misconceptions.every(m => 
      m.toLowerCase().includes('no error') || 
      m.toLowerCase().includes('no misconception') ||
      m.toLowerCase().includes('mathematically correct') ||
      m.toLowerCase().includes('correct and leads to the right answer')
    );
  
  const shouldBeHighGrade = result.studentWorkPresent && 
    hasSubstantialWork && 
    result.isAnswerCorrect && 
    hasNoRealErrors;
  
  console.log(`High grade check - AnswerCorrect: ${result.isAnswerCorrect}, NoRealErrors: ${hasNoRealErrors}, ShouldBeHigh: ${shouldBeHighGrade}`);
  
  // *** CONSISTENCY CHECK: If "no errors found" + work present, grade must be at least 90 ***
  // This prevents the contradictory scenario where AI says "no errors" but assigns 70-85
  // If no errors are found, the minimum grade should reflect that the work is correct
  const noErrorsButWorkPresent = result.studentWorkPresent && 
    hasSubstantialWork && 
    hasNoRealErrors &&
    !explicitlyBlank;
  
  if (noErrorsButWorkPresent) {
    console.log('CONSISTENCY CHECK: No errors detected with work present - enforcing minimum grade of 90');
  }
  
  // *** PERFECT SCORE OVERRIDE: If analysis indicates full mastery, give 100 ***
  if (shouldGetPerfectScore && hasAnyUnderstanding) {
    result.grade = 100;
    console.log('Full mastery detected in analysis - assigning grade 100');
  } else if (shouldBeHighGrade) {
    // CRITICAL: Correct answer with no errors should get AT LEAST 90
    if (result.regentsScore >= 4) {
      result.grade = 100;
    } else if (result.regentsScore >= 3) {
      result.grade = 95;
    } else {
      result.grade = 90;
    }
    console.log(`Correct answer with no errors - assigning high grade: ${result.grade}`);
  } else if (gradeMatch) {
    const parsedGrade = parseInt(gradeMatch[1]);
    
    // *** PRIMARY: TRUST THE AI's GRADE when it's well-reasoned ***
    // The AI was given a consistency rule: its grade must match its evidence.
    // Only override for floor enforcement, not to second-guess the AI.
    if (noErrorsButWorkPresent) {
      // AI said no errors but gave a low grade - override to at least 90
      // If no errors were found, the work is mathematically correct and deserves 90+
      result.grade = Math.max(90, Math.min(100, parsedGrade));
      if (parsedGrade < 90) {
        console.log(`CONSISTENCY: AI gave ${parsedGrade} but no errors found - raised to ${result.grade}`);
        // Add consistency note to justification
        if (!result.gradeJustification.toLowerCase().includes('no error') && 
            !result.gradeJustification.toLowerCase().includes('mathematically correct')) {
          result.gradeJustification += ` Grade raised to ${result.grade} because no mathematical errors were detected in the student's work.`;
        }
      }
    } else if (hasAnyUnderstanding) {
      // Student shows understanding - enforce minimum of 65
      result.grade = Math.max(gradeFloorWithEffort, Math.min(100, parsedGrade));
    } else if (parsedGrade < gradeFloor) {
      result.grade = gradeFloor;
    } else {
      result.grade = Math.min(100, parsedGrade);
    }
  } else if (result.regentsScore >= 0) {
    // Convert Regents score to grade based on concept understanding
    const conceptBonus = Math.min(result.conceptsDemonstrated.length * 2, 5);
    
    const regentsToGrade: Record<number, number> = {
      4: 95,
      3: 85,
      2: 75,
      1: gradeFloorWithEffort + 2,
      0: hasAnyUnderstanding ? gradeFloorWithEffort : gradeFloor,
    };
    result.grade = Math.min(100, (regentsToGrade[result.regentsScore] ?? gradeFloorWithEffort) + conceptBonus);
  } else if (result.totalScore.percentage > 0) {
    const scaledGrade = Math.round(gradeFloorWithEffort + (result.totalScore.percentage / 100) * (100 - gradeFloorWithEffort));
    result.grade = hasAnyUnderstanding ? Math.max(gradeFloorWithEffort, scaledGrade) : Math.max(gradeFloor, scaledGrade);
  } else if (hasAnyUnderstanding) {
    result.grade = gradeFloorWithEffort;
  }

  // FINAL SAFEGUARD: Absolute enforcement of grade floors and consistency
  if (shouldGetPerfectScore && hasAnyUnderstanding) {
    result.grade = 100;
  } else if (shouldBeHighGrade && result.grade < 90) {
    result.grade = 90;
  } else if (noErrorsButWorkPresent && result.grade < 90) {
    // CONSISTENCY: Never give below 90 when no errors detected and work is present
    // If the AI found absolutely no errors, the student's work is mathematically sound
    const previousGrade = result.grade;
    result.grade = 90;
    console.log(`CONSISTENCY SAFEGUARD: Bumped grade from ${previousGrade} to 90 (no errors + work present)`);
    if (!result.gradeJustification.toLowerCase().includes('no error') && 
        !result.gradeJustification.toLowerCase().includes('mathematically correct')) {
      result.gradeJustification += ` Grade raised to 90 because no mathematical errors were detected.`;
    }
  } else if (hasAnyUnderstanding) {
    result.grade = Math.max(gradeFloorWithEffort, result.grade);
  }
  result.grade = Math.max(gradeFloor, result.grade);

  // INCOMPLETE FINAL ANSWER DEDUCTION: If work is correct but final answer is missing/incomplete
  // Deduct 5-10 points (we use 7 as middle ground)
  if (!result.finalAnswerComplete && result.isAnswerCorrect && result.grade > gradeFloor) {
    const incompleteFinalAnswerDeduction = 7; // Deduct 7 points for incomplete final answer
    const gradeBeforeDeduction = result.grade;
    result.grade = Math.max(gradeFloor, result.grade - incompleteFinalAnswerDeduction);
    console.log(`Incomplete final answer deduction: ${gradeBeforeDeduction} -> ${result.grade} (-${incompleteFinalAnswerDeduction} points)`);
    
    // Add note to justification if there isn't one about incomplete answer
    if (!result.gradeJustification.toLowerCase().includes('incomplete') && 
        !result.gradeJustification.toLowerCase().includes('missing final')) {
      result.gradeJustification += ' Deduction applied for incomplete/missing final answer despite correct work setup.';
    }
  } else if (!result.finalAnswerComplete && hasCoherentWork && result.grade > gradeFloor) {
    // Even if answer is not marked as correct, if work is coherent but no final answer, still deduct
    const incompleteDeduction = 5;
    const gradeBeforeDeduction = result.grade;
    result.grade = Math.max(gradeFloor, result.grade - incompleteDeduction);
    console.log(`Incomplete final answer (work shown): ${gradeBeforeDeduction} -> ${result.grade} (-${incompleteDeduction} points)`);
  }
  
  console.log(`Final grade: ${result.grade} (Understanding: ${hasAnyUnderstanding}, Perfect: ${shouldGetPerfectScore}, FinalAnswerComplete: ${result.finalAnswerComplete})`);

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
