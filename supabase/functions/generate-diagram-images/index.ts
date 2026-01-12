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

// Generate image using Nano Banana (google/gemini-2.5-flash-image-preview)
async function generateImageWithNanoBanana(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const enhancedPrompt = `Create a clean, educational diagram for a math worksheet. The image should be suitable for printing on paper.

${prompt}

Requirements:
- Clear geometric shapes with clean lines
- Labels and measurements should be clearly visible
- Black and white or minimal color scheme for printing
- Educational and professional style
- High contrast for readability`;

    console.log('Generating image with Nano Banana...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nano Banana API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Nano Banana response received');
    
    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log('Successfully generated image with Nano Banana');
        return imageUrl;
      }
    }

    console.log('No image in Nano Banana response');
    return null;
  } catch (error) {
    console.error('Error generating with Nano Banana:', error);
    return null;
  }
}

// Generate SVG diagram using standard AI model
async function generateSVGWithAI(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const enhancedPrompt = `Create a clean, educational black and white diagram for a math worksheet. The diagram should be clear, precise, and suitable for printing. ${prompt}. Style: minimalist, educational, with clear labels and measurements. No background color, just clean black lines on white background. Make sure all text labels are legible and properly positioned.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating SVG diagrams for educational math worksheets. Return only valid SVG code, nothing else.' 
          },
          { 
            role: 'user', 
            content: `Generate a complete, valid SVG code for the following diagram. The SVG should be black lines on white background, suitable for a math worksheet. Return ONLY the SVG code, nothing else.

Diagram to create: ${enhancedPrompt}

Requirements:
- SVG should have width="300" height="300" viewBox="0 0 300 300"
- Use stroke="#000000" for all lines
- Use fill="none" for shapes, or fill="#ffffff" for white backgrounds
- Include clear text labels using <text> elements with font-size="14"
- Make sure the diagram is centered and well-proportioned`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
    console.error('Error generating SVG with AI:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, useNanoBanana } = await req.json() as {
      questions: QuestionWithPrompt[];
      useNanoBanana?: boolean;
    };

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting image generation for ${questions.length} questions (Nano Banana: ${useNanoBanana})...`);

    const results: { questionNumber: number; imageUrl: string | null }[] = [];

    for (const q of questions) {
      console.log(`Generating image for question ${q.questionNumber}...`);
      
      let imageUrl: string | null = null;
      
      if (useNanoBanana) {
        // Use Nano Banana for realistic image generation
        imageUrl = await generateImageWithNanoBanana(q.imagePrompt);
      } else {
        // Use standard SVG generation
        imageUrl = await generateSVGWithAI(q.imagePrompt);
      }
      
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