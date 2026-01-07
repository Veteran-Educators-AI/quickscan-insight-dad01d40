import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGeminiAPI(prompt: string, imageBase64: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          maxOutputTokens: 4000,
        }
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate limit exceeded. Please try again in a moment.' };
    }
    if (response.status === 403) {
      throw { status: 403, message: 'API key invalid or quota exceeded. Please check your Google API key settings.' };
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content in Gemini response');
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    const prompt = `Analyze this image of a class roster and extract all student information.

For each student found, extract:
- First name
- Last name
- Student ID (if visible)
- Email (if visible)

Return the data as a JSON array with this exact structure:
{
  "students": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "studentId": "12345",
      "email": "john.doe@school.edu"
    }
  ]
}

If a field is not visible or cannot be determined, omit it from that student's object.
Only include firstName and lastName as required fields.
Parse carefully - this may be a handwritten list, printed roster, or screenshot.
Return ONLY the JSON, no additional text.`;

    // Clean base64 if it has data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const content = await callGeminiAPI(prompt, cleanBase64, geminiApiKey);

    // Parse the JSON response
    let parsed;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Could not parse roster data from image');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in extract-roster-from-image:', error);
    
    // Handle structured errors with status codes
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      return new Response(
        JSON.stringify({ error: (error as { message: string }).message }),
        { status: (error as { status: number }).status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to process roster image';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
