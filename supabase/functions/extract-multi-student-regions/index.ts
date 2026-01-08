import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data is required');
    }

    // Use Gemini to detect and describe regions of student work
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing images of student work. Your task is to identify separate regions in an image where different students' work appears.

Look for:
- Physical separation (different papers, sections, or answer areas)
- Name labels or student identifiers
- Distinct handwriting styles
- Paper edges or dividers

For each detected region, provide:
1. A bounding box as percentages of the image (x, y, width, height from 0-100)
2. Any detected student name
3. A brief description of the work in that region`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify all separate student work regions. 

Respond in this exact JSON format:
{
  "detected_regions": [
    {
      "bounding_box": {"x": 0, "y": 0, "width": 50, "height": 100},
      "detected_name": "John Smith" or null,
      "description": "Math problem showing quadratic equation"
    }
  ],
  "total_students": 3,
  "layout_description": "Three papers arranged horizontally on a desk"
}

If you cannot detect multiple distinct regions, return an empty array.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI detection response:', content);

    // Parse the JSON response
    let detectedRegions: any[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        detectedRegions = parsed.detected_regions || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    if (detectedRegions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        regions: [],
        message: 'No distinct student regions detected'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For each region, create a cropped version using AI image understanding
    // Since we can't actually crop on the server, we'll return the bounding box
    // and let the client handle the visual cropping, but we'll pass the full image
    // with context about which region to focus on during grading
    const regions = detectedRegions.map((region: any, index: number) => ({
      boundingBox: region.bounding_box,
      detectedName: region.detected_name,
      description: region.description,
      // For now, we return the full image but with metadata about the region
      // The analyze function will be told to focus on this specific region
      croppedImage: imageBase64,
      regionIndex: index + 1,
      totalRegions: detectedRegions.length,
    }));

    return new Response(JSON.stringify({
      success: true,
      regions,
      totalDetected: detectedRegions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in extract-multi-student-regions:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
