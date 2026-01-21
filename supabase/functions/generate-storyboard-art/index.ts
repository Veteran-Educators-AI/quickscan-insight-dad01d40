import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryboardRequest {
  questionText: string;
  subject: 'english' | 'history' | 'biology' | 'science' | 'social-studies';
  questionNumber: number;
  style?: 'storyboard' | 'illustration' | 'diagram';
}

// Subject-specific art style prompts
const getSubjectPrompt = (subject: string, style: string = 'storyboard'): string => {
  const styles: Record<string, Record<string, string>> = {
    english: {
      storyboard: 'literary storyboard panel, book illustration style, dramatic scene composition, character-focused, emotional storytelling',
      illustration: 'classic book illustration, detailed pen and ink style, Victorian-era inspired artwork',
      diagram: 'concept map, literary analysis diagram, clean educational graphic'
    },
    history: {
      storyboard: 'historical storyboard panel, documentary-style illustration, period-accurate details, sepia tones',
      illustration: 'historical painting style, Renaissance-inspired artwork, museum quality illustration',
      diagram: 'historical timeline graphic, educational infographic style, clean and informative'
    },
    biology: {
      storyboard: 'scientific storyboard panel, nature documentary style, detailed organism illustration, educational accuracy',
      illustration: 'scientific illustration, detailed anatomical drawing, medical textbook quality',
      diagram: 'biological diagram, labeled anatomy, cell structure, scientific accuracy'
    },
    science: {
      storyboard: 'scientific storyboard panel, experimental process illustration, laboratory scene',
      illustration: 'scientific illustration, physics concept visualization, chemistry apparatus',
      diagram: 'scientific diagram, experimental setup, labeled components'
    },
    'social-studies': {
      storyboard: 'cultural storyboard panel, diverse community scenes, geography and culture',
      illustration: 'cultural illustration, map-style artwork, community and society themes',
      diagram: 'social studies diagram, geographical map, cultural comparison chart'
    }
  };

  return styles[subject]?.[style] || styles.english.storyboard;
};

// Generate storyboard art using Nano Banana (google/gemini-3-pro-image-preview)
async function generateStoryboardArt(
  questionText: string,
  subject: string,
  style: string = 'storyboard'
): Promise<string | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const subjectStyle = getSubjectPrompt(subject, style);
    
    const prompt = `Create a high-quality educational ${style} illustration for a ${subject} worksheet.

Question/Topic Context: "${questionText}"

Art Requirements:
- Style: ${subjectStyle}
- Ultra high resolution, sharp and detailed
- Professional educational illustration quality
- Vibrant colors with good contrast for printing
- NO TEXT, NO LABELS, NO WORDS in the image
- Clean composition focused on the main subject
- Engaging visual that helps students understand the concept
- Suitable for classroom display and worksheets
- Think: National Geographic quality, textbook illustration quality

The image should visually represent or support the question/topic without giving away the answer.`;

    console.log(`Generating ${style} art for ${subject}...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      const errorText = await response.text();
      console.error('Storyboard art generation error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log('Storyboard art response received');
    
    // Extract image from the response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log('Successfully generated storyboard art');
        return imageUrl;
      }
    }

    console.log('No image in storyboard art response');
    return null;
  } catch (error) {
    console.error('Error generating storyboard art:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Single image generation
    if (body.questionText && body.subject) {
      const { questionText, subject, style = 'storyboard' } = body as StoryboardRequest;
      
      console.log(`Generating single storyboard art for ${subject}...`);
      
      const imageUrl = await generateStoryboardArt(questionText, subject, style);
      
      return new Response(
        JSON.stringify({ 
          imageUrl: imageUrl || null, 
          success: !!imageUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch generation for multiple questions
    if (body.questions && Array.isArray(body.questions)) {
      const { questions, subject, style = 'storyboard' } = body as {
        questions: StoryboardRequest[];
        subject: string;
        style?: string;
      };

      console.log(`Generating batch storyboard art for ${questions.length} questions...`);

      const results: { questionNumber: number; imageUrl: string | null }[] = [];

      for (const q of questions) {
        console.log(`Generating storyboard art for question ${q.questionNumber}...`);
        
        const imageUrl = await generateStoryboardArt(
          q.questionText, 
          q.subject || subject, 
          q.style || style
        );
        
        results.push({
          questionNumber: q.questionNumber,
          imageUrl
        });
        
        console.log(`Question ${q.questionNumber}: ${imageUrl ? 'Success' : 'Failed'}`);
      }

      const successCount = results.filter(r => r.imageUrl).length;
      console.log(`Completed: ${successCount}/${questions.length} storyboard images generated`);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Provide questionText and subject, or questions array.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-storyboard-art:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate storyboard art';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
