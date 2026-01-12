import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface IncomingData {
  action: 'grade_completed' | 'activity_completed' | 'reward_earned' | 'level_up' | 'achievement_unlocked';
  student_id: string;
  data: {
    activity_type?: string;
    activity_name?: string;
    score?: number;
    xp_earned?: number;
    coins_earned?: number;
    new_level?: number;
    achievement_name?: string;
    topic_name?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for API key validation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Hash the incoming API key to compare with stored hash
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the API key in the database
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('teacher_api_keys')
      .select('id, teacher_id, is_active')
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (keyError || !keyRecord) {
      console.error('API key not found:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyRecord.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabaseAdmin
      .from('teacher_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    // Parse incoming data
    const body: IncomingData = await req.json();
    
    if (!body.action || !body.student_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: action, student_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the incoming data
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('sister_app_sync_log')
      .insert({
        teacher_id: keyRecord.teacher_id,
        student_id: body.student_id,
        action: body.action,
        data: body.data || {},
        source_app: 'sister_app',
        processed: false,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging sync data:', logError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to log sync data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on action type
    let processedResult = null;
    
    switch (body.action) {
      case 'grade_completed':
      case 'activity_completed':
        // Store in grade_history if there's score data
        if (body.data?.score !== undefined && body.data?.topic_name) {
          const { error: gradeError } = await supabaseAdmin
            .from('grade_history')
            .insert({
              student_id: body.student_id,
              teacher_id: keyRecord.teacher_id,
              topic_name: body.data.topic_name,
              grade: body.data.score,
              grade_justification: `Synced from sister app: ${body.data.activity_name || body.action}`,
            });

          if (gradeError) {
            console.error('Error saving grade:', gradeError);
          } else {
            processedResult = { grade_saved: true };
          }
        }
        break;

      case 'reward_earned':
      case 'level_up':
      case 'achievement_unlocked':
        // Just log these events - they don't need additional processing
        processedResult = { logged: true };
        break;
    }

    // Mark as processed
    await supabaseAdmin
      .from('sister_app_sync_log')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', logEntry.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        log_id: logEntry.id,
        processed: processedResult 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
