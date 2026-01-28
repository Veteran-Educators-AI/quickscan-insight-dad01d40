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
 * Attempt to recover partial JSON from truncated AI responses
 * Finds complete slide objects and reconstructs valid presentation
 */
function recoverTruncatedPresentation(jsonStr: string, topic: string): NycologicPresentation | null {
  console.log("Attempting to recover truncated presentation...");
  
  try {
    // Try to extract presentation metadata
    const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
    const subtitleMatch = jsonStr.match(/"subtitle"\s*:\s*"([^"]+)"/);
    
    // Find all complete slide objects
    const slides: PresentationSlide[] = [];
    const slidePattern = /\{\s*"id"\s*:\s*"slide-\d+"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    
    // More robust: find slides by looking for complete objects with id starting with "slide-"
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
            // Complete slide found
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
      
      // Add a summary slide if not present
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
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You create concise JSON presentations. Return ONLY valid JSON, no markdown.
Keep speakerNotes under 20 words. Keep content items under 15 words each.`,
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

    // Keep slide count small to avoid truncation
    const slideCount = Math.min(Math.floor((parseInt(duration) || 30) / 5), 8);
    const qCount = Math.min(questionCount, 2);

    const prompt = `Create a ${slideCount}-slide presentation about "${topic}" for ${subject}.
${description ? `Context: ${description}` : ''}
${standard ? `Standard: ${standard}` : ''}
${includeQuestions ? `Include ${qCount} question slides.` : ''}

Return this exact JSON structure:
{"id":"${generateId()}","title":"Title Here","subtitle":"Subtitle","topic":"${topic}","slides":[
{"id":"slide-1","type":"title","title":"**${topic}**","subtitle":"${subject.toUpperCase()}","content":["Brief intro"],"speakerNotes":"Welcome notes","icon":"sparkles"},
{"id":"slide-2","type":"content","title":"Key **Concept**","content":["Point 1","Point 2"],"speakerNotes":"Explain","icon":"book"},
{"id":"slide-3","type":"question","title":"**Check**","subtitle":"QUIZ","content":[],"question":{"prompt":"Question?","options":["A","B","C","D"],"answer":"A","explanation":"Why"},"icon":"question"},
{"id":"slide-4","type":"summary","title":"**Takeaways**","content":["Key point 1","Key point 2"],"icon":"award"}
],"createdAt":"${new Date().toISOString()}"}

IMPORTANT: Keep ALL text SHORT. No long sentences. Return ONLY the JSON object.`;

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
      
      // Try to recover partial data
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

    console.log(`Generated presentation with ${presentation.slides.length} slides`);

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
