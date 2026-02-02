import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PresentationSlide {
  id: string;
  type: 'title' | 'content' | 'question' | 'reveal' | 'summary' | 'interactive';
  title: string;
  subtitle?: string;
  content: string[];
  speakerNotes?: string;
  question?: {
    prompt: string;
    options?: string[];
    answer?: string;
    explanation?: string;
  };
  icon?: 'lightbulb' | 'book' | 'question' | 'award' | 'sparkles';
  wordProblem?: {
    problem: string;
    steps: string[];
    finalAnswer: string;
  };
}

interface NycologicPresentation {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  slides: PresentationSlide[];
  createdAt: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Detect if the topic is math-related
 */
function isMathTopic(topic: string, subject: string): boolean {
  const mathKeywords = [
    'math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'equation',
    'polynomial', 'quadratic', 'linear', 'function', 'graph', 'slope',
    'triangle', 'circle', 'angle', 'perimeter', 'area', 'volume',
    'fraction', 'decimal', 'percent', 'ratio', 'proportion', 'statistics',
    'probability', 'theorem', 'pythagorean', 'sine', 'cosine', 'tangent',
    'exponent', 'logarithm', 'derivative', 'integral', 'matrix', 'vector',
    'bond', 'interest', 'annuity', 'present value', 'future value', 'investment'
  ];
  const combined = `${topic} ${subject}`.toLowerCase();
  return mathKeywords.some(kw => combined.includes(kw)) || 
         subject.toLowerCase().includes('math') ||
         ['algebra i', 'algebra ii', 'geometry', 'precalculus', 'statistics', 'financial math'].includes(subject.toLowerCase());
}

/**
 * Detect if the topic is bond/finance-related
 */
function isBondTopic(topic: string, subject: string): boolean {
  const bondKeywords = ['bond', 'coupon', 'yield', 'maturity', 'present value', 'future value', 'par value', 'face value'];
  const combined = `${topic} ${subject}`.toLowerCase();
  return bondKeywords.some(kw => combined.includes(kw));
}

/**
 * Get bond-specific prompt additions
 */
function getBondPromptAdditions(): string {
  return `
BOND CALCULATIONS REQUIREMENTS:
Include these essential bond formulas and calculations:

1. COUPON PAYMENT FORMULA:
   Coupon Payment = (Coupon Rate × Face Value) / Payments per Year
   Example: ($1,000 × 6%) / 2 = $30 per semi-annual payment

2. TOTAL PAYMENTS FORMULA:
   Total Payments = Coupon Payment × Number of Periods
   Example: $30 × 20 periods = $600 total coupon payments

3. PRESENT VALUE OF BOND FORMULA:
   PV = C × [(1 - (1 + r)^(-n)) / r] + FV / (1 + r)^n
   Where: C = coupon payment, r = yield per period, n = number of periods, FV = face value

4. FUTURE VALUE FORMULA:
   FV = PV × (1 + r)^n
   
5. YIELD TO MATURITY (simplified):
   YTM ≈ (C + (FV - P) / n) / ((FV + P) / 2)
   Where: C = annual coupon, FV = face value, P = current price, n = years to maturity

Include word problems that ask students to:
- Calculate semi-annual or annual coupon payments
- Find total interest earned over the life of a bond
- Compute present value of a bond given yield rate
- Determine if a bond is trading at premium, par, or discount
- Calculate future value of reinvested coupon payments

Use realistic values: Face values like $1,000 or $5,000, coupon rates 3%-8%, maturities 5-30 years.
Show all calculations with proper currency formatting ($1,000.00).`;
}

/**
 * Get math-specific prompt additions
 */
function getMathPromptAdditions(topic: string): string {
  return `
MATH PRESENTATION REQUIREMENTS:
1. Use ONLY Unicode math symbols - NEVER use LaTeX notation like \\frac, \\theta, \\pi, \\cdot, \\text
2. Write fractions as: θ/360° × 2πr (NOT \\frac{\\theta}{360°})
3. Use these symbols directly: π √ ² ³ × ÷ ≤ ≥ ≠ ∞ θ Σ ° △ □
4. Include geometric shapes: triangles △, squares □, circles ○
5. For each concept, show a challenging WORD PROBLEM with real-world context
6. After each word problem, provide STEP-BY-STEP SOLUTION with:
   - "Step 1: [identify what we know]"
   - "Step 2: [set up the equation/formula]"
   - "Step 3: [solve step by step]"
   - "Final Answer: [clear answer with units]"
7. Use mathematical notation in content (e.g., "x² + 5x + 6 = 0" not "x squared plus 5x plus 6 equals 0")

CRITICAL: Write math expressions as plain Unicode text like:
- L = (θ/360°) × 2πr (CORRECT)
- \\( L = (\\frac{\\theta}{360°}) \\cdot 2\\pi r \\) (WRONG - NO LATEX!)

For word problems, create scenarios like:
- Finance: loans, interest, investments, budgets
- Construction: measurements, materials, costs
- Science: speed, distance, time, growth rates
- Sports: statistics, scores, averages
- Shopping: discounts, taxes, unit prices`;
}

/**
 * Attempt to recover partial JSON from truncated AI responses
 */
function recoverTruncatedPresentation(jsonStr: string, topic: string): NycologicPresentation | null {
  console.log("Attempting to recover truncated presentation...");
  
  try {
    const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
    const subtitleMatch = jsonStr.match(/"subtitle"\s*:\s*"([^"]+)"/);
    
    const slides: PresentationSlide[] = [];
    let depth = 0;
    let currentSlide = "";
    let inSlide = false;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (char === '{') {
        if (!inSlide && jsonStr.substring(i, i + 30).includes('"id"') && jsonStr.substring(i, i + 50).includes('slide-')) {
          inSlide = true;
          currentSlide = "";
          depth = 0;
        }
        if (inSlide) {
          depth++;
          currentSlide += char;
        }
      } else if (char === '}') {
        if (inSlide) {
          depth--;
          currentSlide += char;
          if (depth === 0) {
            try {
              const slide = JSON.parse(currentSlide);
              if (slide.id && slide.type && slide.title) {
                slides.push(slide);
              }
            } catch {
              // Invalid slide, skip
            }
            inSlide = false;
            currentSlide = "";
          }
        }
      } else if (inSlide) {
        currentSlide += char;
      }
    }
    
    if (slides.length >= 2) {
      console.log(`Recovered ${slides.length} complete slides from truncated response`);
      
      const hasSum = slides.some(s => s.type === 'summary');
      if (!hasSum) {
        slides.push({
          id: `slide-${slides.length + 1}`,
          type: 'summary',
          title: '**Key** Takeaways',
          content: ['Review the main concepts covered today'],
          icon: 'award'
        });
      }
      
      return {
        id: generateId(),
        title: titleMatch?.[1] || `Understanding ${topic}`,
        subtitle: subtitleMatch?.[1] || 'Educational Presentation',
        topic: topic,
        slides: slides,
        createdAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error("Recovery failed:", err);
  }
  
  return null;
}

async function callLovableAI(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      max_tokens: 6000,
      messages: [
        {
          role: "system",
          content: `You create educational JSON presentations. Return ONLY valid JSON, no markdown code blocks.
Keep speakerNotes under 25 words. Keep content items under 20 words each.
Use proper mathematical symbols (π, √, ², θ, ×, ÷) not words.
For math topics, include word problems with step-by-step solutions.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }
    if (response.status === 402) {
      throw new Error("CREDITS_EXHAUSTED");
    }
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const responseText = await response.text();
  
  if (!responseText || responseText.trim() === "") {
    throw new Error("AI returned an empty response. Please try again.");
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("Failed to parse AI API response:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI response. Please try again.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI response was incomplete. Please try again.");
  }

  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      subject = "General", 
      description = "", 
      duration = "30 minutes",
      includeQuestions = true,
      questionCount = 2,
      standard = ""
    } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Missing required field: topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating Nycologic presentation for: ${topic}`);

    const isMath = isMathTopic(topic, subject);
    const isBond = isBondTopic(topic, subject);
    const slideCount = Math.min(Math.floor((parseInt(duration) || 30) / 5), 10);
    const qCount = Math.min(questionCount, 3);

    // Build the prompt based on whether it's a math topic
    let prompt = `Create a ${slideCount}-slide presentation about "${topic}" for ${subject}.
${description ? `Context: ${description}` : ''}
${standard ? `Standard: ${standard}` : ''}
${includeQuestions ? `Include ${qCount} question slides with multiple choice options.` : ''}`;

    if (isMath) {
      prompt += getMathPromptAdditions(topic);
      
      // Add bond-specific formulas if it's a bond topic
      if (isBond) {
        prompt += getBondPromptAdditions();
      }
      
      prompt += `

For this MATH presentation, include:
- At least 2 slides with challenging word problems
- Each word problem should have a "wordProblem" field with:
  - "problem": the real-world scenario
  - "steps": array of step-by-step solution strings
  - "finalAnswer": the complete answer with units

${isBond ? `Example BOND word problem slide:
{"id":"slide-3","type":"content","title":"**Bond** Calculations","content":["Calculate total payments and present value"],"wordProblem":{"problem":"A corporate bond has a face value of $5,000, a coupon rate of 6% paid semi-annually, and matures in 10 years. If the current yield is 5%, calculate: (a) the semi-annual coupon payment, (b) total coupon payments over the life of the bond, and (c) the present value of the bond.","steps":["Step 1: Semi-annual coupon = ($5,000 × 6%) / 2 = $150","Step 2: Number of periods = 10 years × 2 = 20 periods","Step 3: Total coupon payments = $150 × 20 = $3,000","Step 4: Yield per period = 5% / 2 = 2.5% = 0.025","Step 5: PV of coupons = $150 × [(1 - (1.025)^(-20)) / 0.025] = $150 × 15.5892 = $2,338.38","Step 6: PV of face value = $5,000 / (1.025)^20 = $5,000 / 1.6386 = $3,051.63","Step 7: Total PV = $2,338.38 + $3,051.63 = $5,390.01"],"finalAnswer":"(a) $150 per period, (b) $3,000 total coupons, (c) PV = $5,390.01 (trading at premium)"},"icon":"lightbulb"}` : `Example word problem slide:
{"id":"slide-3","type":"content","title":"**Real-World** Application","content":["Let's solve a challenging problem"],"wordProblem":{"problem":"A rectangular garden has a perimeter of 56 feet. If the length is 4 feet more than twice the width, find the dimensions.","steps":["Step 1: Let w = width, then length = 2w + 4","Step 2: Perimeter = 2(length) + 2(width) = 56","Step 3: 2(2w + 4) + 2w = 56","Step 4: 4w + 8 + 2w = 56","Step 5: 6w = 48","Step 6: w = 8 feet, length = 2(8) + 4 = 20 feet"],"finalAnswer":"Width = 8 feet, Length = 20 feet"},"icon":"lightbulb"}`}`;
    }

    prompt += `

Return this JSON structure (no markdown, just JSON):
{"id":"${generateId()}","title":"Title with **bold** keywords","subtitle":"${subject.toUpperCase()}","topic":"${topic}","slides":[
{"id":"slide-1","type":"title","title":"**${topic}**","subtitle":"${subject.toUpperCase()}","content":["Brief engaging intro"],"speakerNotes":"Welcome notes","icon":"sparkles"},
{"id":"slide-2","type":"content","title":"Key **Concept**","content":["Main point with symbols like π, √, or ²","Formula: y = mx + b"],"speakerNotes":"Explain clearly","icon":"book"},
${isMath ? '{"id":"slide-3","type":"content","title":"**Word Problem** Challenge","content":["Apply what we learned"],"wordProblem":{"problem":"Challenging real-world scenario here","steps":["Step 1: Identify knowns","Step 2: Set up equation","Step 3: Solve","Step 4: Check answer"],"finalAnswer":"Complete answer with units"},"icon":"lightbulb"},' : ''}
{"id":"slide-${isMath ? '4' : '3'}","type":"question","title":"**Check** Understanding","subtitle":"QUIZ","content":[],"question":{"prompt":"Question with math symbols?","options":["A) First option","B) Second option","C) Third option","D) Fourth option"],"answer":"A","explanation":"Clear explanation of why"},"icon":"question"},
{"id":"slide-${isMath ? '5' : '4'}","type":"summary","title":"**Key** Takeaways","content":["Important point 1","Important point 2","Formula to remember"],"icon":"award"}
],"createdAt":"${new Date().toISOString()}"}

IMPORTANT: 
- Use actual math symbols (π, √, ², ³, θ, ×, ÷, ≤, ≥, ∞)
- Keep text concise but mathematically precise
- Word problems should be grade-appropriate but challenging
- Return ONLY the JSON object`;

    const aiResponse = await callLovableAI(prompt);
    
    // Clean up the response
    let cleanedResponse = aiResponse.trim();
    
    // Remove markdown code blocks
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();
    
    // Remove comments
    cleanedResponse = cleanedResponse.replace(/\/\/[^\n]*\n?/g, '');
    cleanedResponse = cleanedResponse.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanedResponse = cleanedResponse.trim();

    let presentation: NycologicPresentation;
    try {
      presentation = JSON.parse(cleanedResponse);
    } catch {
      console.error("Failed to parse AI response, attempting recovery:", cleanedResponse.substring(0, 1000));
      
      const recovered = recoverTruncatedPresentation(cleanedResponse, topic);
      if (recovered) {
        presentation = recovered;
      } else {
        throw new Error("Failed to parse presentation. Please try again.");
      }
    }
    
    // Ensure all slides have IDs and content is properly formatted
    presentation.slides = presentation.slides.map((slide, index) => ({
      ...slide,
      id: slide.id || `slide-${index + 1}`,
      content: (slide.content || []).map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return String(obj.text || obj.heading || JSON.stringify(item));
        }
        return String(item || '');
      }),
    }));
    
    if (!presentation.id) {
      presentation.id = generateId();
    }

    console.log(`Generated ${isMath ? 'MATH' : 'standard'} presentation with ${presentation.slides.length} slides`);

    return new Response(
      JSON.stringify({ success: true, presentation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating presentation:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage === "RATE_LIMIT_EXCEEDED") {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (errorMessage === "CREDITS_EXHAUSTED") {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});