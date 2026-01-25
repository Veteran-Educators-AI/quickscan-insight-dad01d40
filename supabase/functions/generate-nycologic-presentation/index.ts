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
  createdAt: Date;
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
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert presentation designer and educator. You create stunning, engaging presentations that feel like modern websites - not boring PowerPoints.

Your presentations:
- Use bold, impactful statements
- Feature interactive Q&A moments
- Have smooth visual flow
- Include relevant examples and analogies
- Use **bold** markers for key terms that should be highlighted

Slide types available:
- "title": Opening slide with main topic
- "content": Information and explanations
- "question": Interactive Q&A with multiple choice or open questions
- "reveal": Information revealed step by step
- "summary": Key takeaways
- "interactive": Engagement activities

Icons available: "lightbulb" (ideas), "book" (learning), "question" (Q&A), "award" (achievements), "sparkles" (highlights)

Always return valid JSON without markdown formatting.`,
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

  // Get response text first to handle empty responses
  const responseText = await response.text();
  
  if (!responseText || responseText.trim() === "") {
    console.error("AI API returned empty response");
    throw new Error("AI returned an empty response. Please try again.");
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    console.error("Failed to parse AI API response:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI response. Please try again.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("AI response missing content:", JSON.stringify(data).substring(0, 500));
    throw new Error("AI response was incomplete. Please try again.");
  }

  return content;
}

function generateId(): string {
  return crypto.randomUUID();
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
      questionCount = 3,
      style = "engaging",
      standard = ""
    } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Missing required field: topic" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating Nycologic presentation for: ${topic}`);

    // Calculate slide count based on duration
    const durationMinutes = parseInt(duration) || 30;
    const minSlides = Math.floor(durationMinutes / 4);
    const maxSlides = Math.floor(durationMinutes / 2.5);

    const prompt = `Create a stunning, modern presentation about "${topic}" for ${subject}.

${description ? `Additional context: ${description}` : ''}
${standard ? `Academic standard: ${standard}` : ''}

Style: ${style === 'engaging' ? 'Engaging and interactive with questions' : style === 'formal' ? 'Formal and academic' : 'Story-based learning journey'}
Duration: ${duration} (aim for ${minSlides}-${maxSlides} slides)
${includeQuestions ? `Include ${questionCount} interactive question slides spread throughout` : 'No question slides needed'}

Generate a JSON object with this exact structure:

{
  "id": "${generateId()}",
  "title": "An engaging, memorable title",
  "subtitle": "A compelling subtitle or tagline",
  "topic": "${topic}",
  "slides": [
    {
      "id": "unique-id",
      "type": "title",
      "title": "Main **Topic** Title",
      "subtitle": "${subject.toUpperCase()} SERIES",
      "content": ["A brief engaging description of what students will learn"],
      "speakerNotes": "Welcome and introduction notes",
      "icon": "sparkles"
    },
    {
      "id": "unique-id",
      "type": "content",
      "title": "Key Concept with **Highlighted** Terms",
      "content": ["Point 1 explanation", "Point 2 explanation"],
      "speakerNotes": "Teaching notes for this slide",
      "icon": "book"
    },
    {
      "id": "unique-id",
      "type": "question",
      "title": "Let's **Test** Your Understanding",
      "subtitle": "QUICK CHECK",
      "content": [],
      "question": {
        "prompt": "The question to ask",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "The correct option text",
        "explanation": "Why this is the correct answer"
      },
      "icon": "question"
    },
    // More slides following this pattern...
    {
      "id": "unique-id",
      "type": "summary",
      "title": "**Key** Takeaways",
      "content": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
      "icon": "award"
    }
  ],
  "createdAt": "${new Date().toISOString()}"
}

Requirements:
1. Use **bold** markers around key terms that should be highlighted in amber/gold
2. Each slide should have a clear, impactful title
3. Content should be concise - bullet points, not paragraphs
4. Questions should have 4 multiple choice options with one correct answer
5. Include speaker notes with teaching tips
6. Use appropriate icons for each slide type
7. Create a logical flow from introduction to summary
8. Make it feel like a modern website presentation, not PowerPoint
9. Generate unique IDs for each slide (use format "slide-1", "slide-2", etc.)

Return ONLY the JSON object, no markdown formatting or code blocks.`;

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
    
    // Remove JavaScript-style comments that AI sometimes includes
    // Remove single-line comments like // comment
    cleanedResponse = cleanedResponse.replace(/\/\/[^\n]*\n?/g, '');
    // Remove multi-line comments like /* comment */
    cleanedResponse = cleanedResponse.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanedResponse = cleanedResponse.trim();

    let presentation: NycologicPresentation;
    try {
      presentation = JSON.parse(cleanedResponse);
      
      // Ensure all slides have IDs and content is properly formatted as strings
      presentation.slides = presentation.slides.map((slide, index) => ({
        ...slide,
        id: slide.id || `slide-${index + 1}`,
        // Ensure content array only contains strings (AI sometimes returns objects)
        content: (slide.content || []).map((item: string | Record<string, unknown>) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // Handle {heading, text} or {text} objects
            return String(item.text || item.heading || JSON.stringify(item));
          }
          return String(item || '');
        }) as string[],
      }));
      
      // Ensure presentation has an ID
      if (!presentation.id) {
        presentation.id = generateId();
      }
      
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanedResponse.substring(0, 1000));
      throw new Error("Failed to parse presentation from AI response");
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
