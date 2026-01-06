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

// Generate image using Gemini Flash Image
async function generateWithGeminiFlash(prompt: string, lovableApiKey: string): Promise<string | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      console.error('Gemini Flash Image error:', await response.text());
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (error) {
    console.error('Error generating with Gemini Flash:', error);
    return null;
  }
}

// Generate image using Gemini Pro Image (next-gen)
async function generateWithGeminiPro(prompt: string, lovableApiKey: string): Promise<string | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      console.error('Gemini Pro Image error:', await response.text());
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return imageUrl || null;
  } catch (error) {
    console.error('Error generating with Gemini Pro:', error);
    return null;
  }
}

// Try multiple generators for best result
async function generateBestImage(prompt: string, lovableApiKey: string): Promise<string | null> {
  const enhancedPrompt = `Create a clean, educational black and white diagram for a math worksheet. The diagram should be clear, precise, and suitable for printing. ${prompt}. Style: minimalist, educational, with clear labels and measurements. No background color, just clean black lines on white background. Make sure all text labels are legible and properly positioned.`;

  // Try Gemini Pro first for higher quality
  console.log('Trying Gemini Pro Image generator...');
  let imageUrl = await generateWithGeminiPro(enhancedPrompt, lovableApiKey);
  
  if (imageUrl) {
    console.log('Successfully generated with Gemini Pro');
    return imageUrl;
  }

  // Fallback to Gemini Flash
  console.log('Falling back to Gemini Flash Image generator...');
  imageUrl = await generateWithGeminiFlash(enhancedPrompt, lovableApiKey);
  
  if (imageUrl) {
    console.log('Successfully generated with Gemini Flash');
    return imageUrl;
  }

  console.log('All image generators failed');
  return null;
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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Starting image generation for ${questions.length} questions...`);

    const results: { questionNumber: number; imageUrl: string | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      const imageUrl = await generateBestImage(q.imagePrompt, lovableApiKey);
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
