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
BOND & TIME VALUE OF MONEY - COMPREHENSIVE REQUIREMENTS:

You MUST include ALL of these formulas with clear explanations:

═══════════════════════════════════════════════════════════
SECTION 1: CORE BOND FORMULAS
═══════════════════════════════════════════════════════════

1. COUPON PAYMENT:
   Annual Coupon = Face Value × Coupon Rate
   Semi-annual Coupon = (Face Value × Coupon Rate) / 2

2. TOTAL COUPON PAYMENTS:
   Total = Coupon Payment × Number of Periods

3. CURRENT YIELD:
   Current Yield = Annual Coupon Payment / Current Market Price × 100%

═══════════════════════════════════════════════════════════
SECTION 2: PRESENT VALUE (PV) FORMULAS - CRITICAL!
═══════════════════════════════════════════════════════════

4. PRESENT VALUE OF A SINGLE AMOUNT:
   PV = FV / (1 + r)^n
   Where: FV = future value, r = discount rate per period, n = number of periods
   
5. PRESENT VALUE OF BOND (combining coupon stream + face value):
   PV = C × [(1 - (1 + r)^(-n)) / r] + FV / (1 + r)^n
   Where: C = coupon payment, r = discount rate per period, n = periods, FV = face value

6. PRESENT VALUE OF ANNUITY (coupon stream):
   PVA = PMT × [(1 - (1 + r)^(-n)) / r]

═══════════════════════════════════════════════════════════
SECTION 3: FUTURE VALUE (FV) FORMULAS - CRITICAL!
═══════════════════════════════════════════════════════════

7. FUTURE VALUE OF A SINGLE AMOUNT:
   FV = PV × (1 + r)^n
   
8. FUTURE VALUE OF ANNUITY (reinvested coupons):
   FVA = PMT × [((1 + r)^n - 1) / r]

═══════════════════════════════════════════════════════════
SECTION 4: DISCOUNT RATE & YIELD - CRITICAL!
═══════════════════════════════════════════════════════════

9. DISCOUNT RATE EXPLAINED:
   - The discount rate is the interest rate used to determine present value
   - Higher discount rate = Lower present value
   - Lower discount rate = Higher present value
   - For bonds, discount rate often equals market yield or required return

10. YIELD TO MATURITY (YTM):
    YTM ≈ (C + (FV - P) / n) / ((FV + P) / 2)
    Where: C = annual coupon, FV = face value, P = current price, n = years

11. BOND PRICING RELATIONSHIP:
    - If Coupon Rate > Market Rate → Bond trades at PREMIUM (PV > Face Value)
    - If Coupon Rate < Market Rate → Bond trades at DISCOUNT (PV < Face Value)
    - If Coupon Rate = Market Rate → Bond trades at PAR (PV = Face Value)

═══════════════════════════════════════════════════════════
REQUIRED: AT LEAST 6 WORKED EXAMPLES
═══════════════════════════════════════════════════════════

You MUST include AT LEAST 6 complete word problems with step-by-step solutions:

EXAMPLE 1 - Present Value Calculation:
"A $1,000 bond pays 6% annually and matures in 5 years. If the discount rate is 8%, find the present value."

EXAMPLE 2 - Future Value Calculation:
"You invest $2,500 today at 5% annual interest. What is the future value in 10 years?"

EXAMPLE 3 - Coupon Payments & Total Interest:
"A $5,000 bond with 4% coupon rate paid semi-annually matures in 15 years. Calculate total interest earned."

EXAMPLE 4 - Discount Rate Impact:
"A $1,000 bond pays $60 annually. Calculate PV using (a) 5% discount rate and (b) 7% discount rate. Explain the difference."

EXAMPLE 5 - Premium vs Discount:
"A $1,000 bond has a 7% coupon rate. The market rate is 5%. Is this bond at premium or discount? Calculate PV for 10 years."

EXAMPLE 6 - Future Value of Reinvested Coupons:
"If you receive $50 semi-annually from a bond and reinvest at 4% per period, what's the FV after 20 periods?"

Use realistic values: Face values $1,000-$10,000, coupon rates 3%-8%, maturities 5-30 years.
Format all currency with $ and commas: $1,000.00, $5,250.75`;
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
    // For bond topics, generate more slides to fit 6+ examples
    const baseSlideCount = Math.min(Math.floor((parseInt(duration) || 30) / 5), 10);
    const slideCount = isBond ? Math.max(baseSlideCount, 12) : baseSlideCount;
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
        prompt += `

BOND PRESENTATION STRUCTURE (${slideCount} slides minimum):
Slide 1: Title slide
Slide 2: What is a Bond? (definitions: face value, coupon, maturity)
Slide 3: Present Value Formula - PV = FV / (1 + r)^n with explanation
Slide 4: Future Value Formula - FV = PV × (1 + r)^n with explanation  
Slide 5: Discount Rate Explained - What it is, how it affects bond prices
Slide 6-11: SIX WORKED EXAMPLES (one per slide) - Each with wordProblem field:
   - Example 1: Calculate Present Value of a bond
   - Example 2: Calculate Future Value of an investment
   - Example 3: Calculate total coupon payments
   - Example 4: Compare PV with different discount rates
   - Example 5: Determine if bond trades at premium/discount
   - Example 6: Future Value of reinvested coupons
Slide 12: Summary of all formulas

CRITICAL: You MUST include exactly 6 slides with wordProblem objects containing worked examples!`;
      }
      
      prompt += `

For this MATH presentation, include:
- ${isBond ? 'AT LEAST 6 slides' : 'At least 2 slides'} with challenging word problems
- Each word problem should have a "wordProblem" field with:
  - "problem": the real-world scenario
  - "steps": array of step-by-step solution strings (5-8 steps each)
  - "finalAnswer": the complete answer with units

${isBond ? `Example BOND Present Value slide:
{"id":"slide-6","type":"content","title":"**Present Value** Calculation","content":["Using PV = FV / (1 + r)^n"],"wordProblem":{"problem":"Find the present value of a $1,000 bond that pays 6% annually and matures in 5 years. The current discount rate is 8%.","steps":["Step 1: Identify given values: FV = $1,000, Coupon Rate = 6%, n = 5 years, Discount Rate (r) = 8%","Step 2: Calculate annual coupon payment: C = $1,000 × 6% = $60","Step 3: Apply PV formula for coupons: PVA = $60 × [(1 - (1.08)^(-5)) / 0.08]","Step 4: Calculate: PVA = $60 × [(1 - 0.6806) / 0.08] = $60 × 3.9927 = $239.56","Step 5: Calculate PV of face value: PV = $1,000 / (1.08)^5 = $1,000 / 1.4693 = $680.58","Step 6: Add both components: Total PV = $239.56 + $680.58 = $920.14","Step 7: Since PV ($920.14) < Face Value ($1,000), bond trades at DISCOUNT"],"finalAnswer":"Present Value = $920.14 (Bond trades at discount because discount rate 8% > coupon rate 6%)"},"icon":"lightbulb"}

Example BOND Future Value slide:
{"id":"slide-7","type":"content","title":"**Future Value** Calculation","content":["Using FV = PV × (1 + r)^n"],"wordProblem":{"problem":"You invest $2,500 today in a savings bond that pays 5% annual interest. What will be the future value in 10 years?","steps":["Step 1: Identify given values: PV = $2,500, r = 5% = 0.05, n = 10 years","Step 2: Write the Future Value formula: FV = PV × (1 + r)^n","Step 3: Substitute values: FV = $2,500 × (1 + 0.05)^10","Step 4: Calculate (1.05)^10 = 1.6289","Step 5: Multiply: FV = $2,500 × 1.6289 = $4,072.25","Step 6: Calculate total interest earned: $4,072.25 - $2,500 = $1,572.25"],"finalAnswer":"Future Value = $4,072.25 (You earn $1,572.25 in interest over 10 years)"},"icon":"lightbulb"}

Example Discount Rate Comparison slide:
{"id":"slide-8","type":"content","title":"**Discount Rate** Impact","content":["How discount rate affects bond value"],"wordProblem":{"problem":"A $1,000 bond pays $60 annually for 5 years. Calculate the present value using (a) 5% discount rate and (b) 7% discount rate. Explain why the values differ.","steps":["Step 1: Given: Face Value = $1,000, Annual Coupon = $60, n = 5 years","Step 2: At 5% discount rate: PV of coupons = $60 × 4.3295 = $259.77","Step 3: PV of face value at 5% = $1,000 / (1.05)^5 = $783.53","Step 4: Total PV at 5% = $259.77 + $783.53 = $1,043.30","Step 5: At 7% discount rate: PV of coupons = $60 × 4.1002 = $246.01","Step 6: PV of face value at 7% = $1,000 / (1.07)^5 = $712.99","Step 7: Total PV at 7% = $246.01 + $712.99 = $959.00","Step 8: Higher discount rate → Lower present value"],"finalAnswer":"At 5%: PV = $1,043.30 (premium) | At 7%: PV = $959.00 (discount) | Higher discount rates reduce bond value"},"icon":"lightbulb"}` : `Example word problem slide:
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
${isBond ? '- MUST include 6 worked examples with PV, FV, and discount rate calculations' : ''}
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