import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionWithPrompt {
  questionNumber: number;
  imagePrompt: string;
}

// Generate image using Google's Imagen via Gemini API
async function generateImageWithGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const enhancedPrompt = `Create a clean, educational black and white diagram for a math worksheet. The diagram should be clear, precise, and suitable for printing. ${prompt}. Style: minimalist, educational, with clear labels and measurements. No background color, just clean black lines on white background. Make sure all text labels are legible and properly positioned.`;

    // Use Gemini 2.0 Flash for text-based diagram description
    // Note: Direct image generation requires Imagen API, but we can generate SVG descriptions
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a complete, valid SVG code for the following diagram. The SVG should be black lines on white background, suitable for a math worksheet. Return ONLY the SVG code, nothing else.

Diagram to create: ${enhancedPrompt}

Requirements:
- SVG should have width="300" height="300" viewBox="0 0 300 300"
- Use stroke="#000000" for all lines
- Use fill="none" for shapes, or fill="#ffffff" for white backgrounds
- Include clear text labels using <text> elements with font-size="14"
- Make sure the diagram is centered and well-proportioned`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return null;
    }

    // Extract SVG from the response
    const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      // Convert SVG to data URL
      const svgString = svgMatch[0];
      const base64Svg = btoa(unescape(encodeURIComponent(svgString)));
      return `data:image/svg+xml;base64,${base64Svg}`;
    }

    return null;
  } catch (error) {
    console.error('Error generating with Gemini:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json() as {
      questions: QuestionWithPrompt[];
    };

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    console.log(`Starting image generation for ${questions.length} questions...`);

    const results: { questionNumber: number; imageUrl: string | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      const imageUrl = await generateImageWithGemini(q.imagePrompt, geminiApiKey);
      results.push({
        questionNumber: q.questionNumber,
        imageUrl
      });
      console.log(`Question ${q.questionNumber}: ${imageUrl ? 'Success' : 'Failed'}`);
    }

    const successCount = results.filter(r => r.imageUrl).length;
    console.log(`Completed: ${successCount}/${questions.length} images generated successfully`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-diagram-images:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate images';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
