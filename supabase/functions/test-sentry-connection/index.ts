import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { webhookUrl, apiKey } = await req.json();

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'No webhook URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'No API key provided. Please enter your Sentry API key.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create test payload
    const testPayload = {
      event_type: 'connection_test',
      timestamp: new Date().toISOString(),
      source: 'nyclogic-ai',
      message: 'Connection test from NYCLogic AI to Nyclogic Sentry',
      teacher_id: user.id,
      test_data: {
        sample_student: 'Test Student',
        sample_score: 85,
        sample_topic: 'Algebra - Linear Equations',
        sample_level: 'B',
        sample_misconceptions: ['Sign error when moving terms', 'Forgot to distribute'],
      },
    };

    console.log('Testing connection to:', webhookUrl);

    // Send test to Sentry with API key
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    console.log('Sentry response status:', response.status);
    console.log('Sentry response:', responseText);

    if (response.ok) {
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Successfully connected to Nyclogic Sentry!',
          sentry_response: responseData,
          status_code: response.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Sentry returned error: ${response.status}`,
          details: responseText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error testing Sentry connection:', error);
    const message = error instanceof Error ? error.message : 'Failed to connect to Sentry';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
