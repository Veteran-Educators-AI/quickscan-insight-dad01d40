import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SISTER_APP_ENDPOINT = 'https://rjlqmfthemfpetpcydog.supabase.co/functions/v1/teacher-push';

interface PushRequest {
  class_id: string;
  title: string;
  description?: string;
  due_at?: string;
  standard_code?: string;
  xp_reward?: number;
  coin_reward?: number;
  printable_url?: string;
  // Additional fields for student data
  student_id?: string;
  student_name?: string;
  grade?: number;
  topic_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sisterAppApiKey = Deno.env.get('SISTER_APP_API_KEY');
    
    if (!sisterAppApiKey) {
      console.error('SISTER_APP_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Sister app API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: PushRequest = await req.json();
    
    console.log('Pushing data to sister app:', JSON.stringify(requestData));

    // Send to sister app
    const response = await fetch(SISTER_APP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sisterAppApiKey,
      },
      body: JSON.stringify(requestData),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Sister app error:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to push to sister app',
          status: response.status,
          details: responseText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('Sister app response:', responseData);

    return new Response(
      JSON.stringify({ success: true, response: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in push-to-sister-app:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
