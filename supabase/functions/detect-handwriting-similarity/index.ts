import "https://esm.sh/@anthropic-ai/sdk@0.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimilarityResult {
  isSameStudent: boolean;
  confidence: 'high' | 'medium' | 'low';
  similarityScore: number; // 0-100
  reasoning: string;
  handwritingFeatures: {
    slantSimilar: boolean;
    sizeSimilar: boolean;
    styleSimilar: boolean;
    spacingSimilar: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image1Base64, image2Base64 } = await req.json();

    if (!image1Base64 || !image2Base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Two images are required for comparison' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format images for AI
    const formatImage = (base64: string) => {
      const cleanBase64 = base64.replace(/^data:image\/[^;]+;base64,/, '');
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${cleanBase64}`,
        },
      };
    };

    const systemPrompt = `You are an expert forensic handwriting analyst. Your task is to compare handwriting samples from two images to determine if they were written by the SAME PERSON.

CRITICAL: This is used for grouping multi-page student work - if the handwriting matches, the pages belong to the same student's paper and should be graded together.

Focus on these handwriting characteristics:
1. SLANT: Angle of letters (vertical, right-leaning, left-leaning)
2. SIZE: Letter height and width consistency
3. STYLE: Letter formations, loops, connections between letters
4. SPACING: Distance between words and letters
5. PRESSURE: Line thickness patterns (if visible)
6. BASELINE: How consistently the writing follows lines
7. UNIQUE FEATURES: Distinctive letter formations (e.g., how 't' is crossed, 'i' is dotted)

Be decisive - when papers are sequential (one right after another in a scanner), there's a high probability they belong to the same student if handwriting is similar.`;

    const userPrompt = `Compare the handwriting in these two images and determine if they were written by the SAME STUDENT.

Image 1 is one page of student work.
Image 2 is the NEXT PAGE in sequence (potentially the back side or a continuation).

Analyze the handwriting characteristics and respond in this exact JSON format:
{
  "is_same_student": true,
  "confidence": "high",
  "similarity_score": 85,
  "reasoning": "The slant, letter size, and distinctive 'y' formation are identical between both pages",
  "handwriting_features": {
    "slant_similar": true,
    "size_similar": true,
    "style_similar": true,
    "spacing_similar": true
  }
}

SCORING GUIDE:
- 80-100: High confidence same student
- 60-79: Medium confidence, likely same student
- 40-59: Uncertain
- 0-39: Likely different students

IMPORTANT: If the pages appear to be sequential work (continuation of math problems, etc.) and handwriting is similar, lean toward same_student = true.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              formatImage(image1Base64),
              formatImage(image2Base64),
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('Handwriting comparison raw response:', content);

    // Parse the JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const result: SimilarityResult = {
          isSameStudent: Boolean(parsed.is_same_student),
          confidence: parsed.confidence || 'low',
          similarityScore: Number(parsed.similarity_score) || 0,
          reasoning: parsed.reasoning || '',
          handwritingFeatures: {
            slantSimilar: Boolean(parsed.handwriting_features?.slant_similar),
            sizeSimilar: Boolean(parsed.handwriting_features?.size_similar),
            styleSimilar: Boolean(parsed.handwriting_features?.style_similar),
            spacingSimilar: Boolean(parsed.handwriting_features?.spacing_similar),
          },
        };

        return new Response(
          JSON.stringify({ success: true, similarity: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Failed to parse similarity response:', parseError);
    }

    // Default fallback - assume not same student if parsing fails
    return new Response(
      JSON.stringify({
        success: true,
        similarity: {
          isSameStudent: false,
          confidence: 'low',
          similarityScore: 50,
          reasoning: 'Unable to parse AI response - defaulting to separate students',
          handwritingFeatures: {
            slantSimilar: false,
            sizeSimilar: false,
            styleSimilar: false,
            spacingSimilar: false,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Handwriting similarity error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
