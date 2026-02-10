import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * OCR Edge Function — Uses Google Cloud Vision API for fast, reliable text extraction.
 * 
 * Input:  { imageBase64: string, additionalImages?: string[] }
 * Output: { success: true, ocrText: string, pages: string[] }
 * 
 * Each image is processed via Vision API TEXT_DETECTION (~1-2 seconds per image).
 * All pages are concatenated with page markers for the grading AI.
 */

async function extractTextFromImage(imageBase64: string, apiKey: string): Promise<string> {
  // Strip data URL prefix if present → Vision API wants raw base64
  let raw = imageBase64;
  if (raw.startsWith('data:')) {
    raw = raw.split(',')[1] || raw;
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: raw },
          features: [
            { type: 'TEXT_DETECTION' },
            { type: 'DOCUMENT_TEXT_DETECTION' },
          ],
        }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Vision API error: ${response.status}`, errText);
    throw new Error(`Vision API error: ${response.status}`);
  }

  const data = await response.json();
  const annotations = data.responses?.[0];

  if (annotations?.error) {
    console.error('Vision API annotation error:', annotations.error);
    throw new Error(annotations.error.message || 'Vision API annotation error');
  }

  // DOCUMENT_TEXT_DETECTION gives better structured text for handwriting
  const fullText = annotations?.fullTextAnnotation?.text
    || annotations?.textAnnotations?.[0]?.description
    || '';

  return fullText.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('GOOGLE_VISION_API_KEY not configured');
    }

    const { imageBase64, additionalImages } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageBase64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process all images in parallel for speed
    const allImages = [imageBase64, ...(additionalImages || [])];
    const startTime = Date.now();

    console.log(`[OCR] Processing ${allImages.length} image(s)...`);

    const results = await Promise.all(
      allImages.map((img, i) =>
        extractTextFromImage(img, GOOGLE_VISION_API_KEY)
          .then(text => {
            console.log(`[OCR] Page ${i + 1}: ${text.length} chars extracted`);
            return text;
          })
          .catch(err => {
            console.error(`[OCR] Page ${i + 1} failed:`, err.message);
            return `[OCR FAILED FOR PAGE ${i + 1}]`;
          })
      )
    );

    // Combine pages with markers
    let combinedText: string;
    if (results.length === 1) {
      combinedText = results[0];
    } else {
      combinedText = results
        .map((text, i) => `--- PAGE ${i + 1} ---\n${text}`)
        .join('\n\n');
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[OCR] Complete: ${combinedText.length} total chars in ${latencyMs}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        ocrText: combinedText,
        pages: results,
        pageCount: results.length,
        latencyMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[OCR] Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'OCR processing failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
