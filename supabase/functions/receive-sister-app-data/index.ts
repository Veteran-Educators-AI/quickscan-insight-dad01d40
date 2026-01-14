// =============================================================================
// RECEIVE SISTER APP DATA - Edge Function
// =============================================================================
// This edge function allows the sister app (NYClogic Scholar Ai)
// to send graded work and activity data back to NYCLogic Ai.
// 
// HOW IT WORKS:
// 1. Sister app sends a POST request with an API key in the x-api-key header
// 2. We validate the API key by hashing it and comparing to stored hashes
// 3. If valid, we log the incoming data and optionally save grades
// 4. We return success/failure response to the sister app
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -----------------------------------------------------------------------------
// CORS HEADERS
// -----------------------------------------------------------------------------
// These headers allow the edge function to be called from any origin.
// This is necessary because the sister app might be hosted on a different domain.
// The x-api-key header is explicitly allowed for API key authentication.
// -----------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// -----------------------------------------------------------------------------
// INCOMING DATA INTERFACE
// -----------------------------------------------------------------------------
// This defines the structure of data the sister app can send.
// 
// action: What type of event is being reported
//   - grade_completed: Student finished graded work
//   - activity_completed: Student finished an activity (game, quiz, etc.)
//   - reward_earned: Student earned XP, coins, or other rewards
//   - level_up: Student reached a new level
//   - achievement_unlocked: Student earned an achievement/badge
//
// student_id: The UUID of the student in our database
//
// data: Flexible object containing event-specific information
// -----------------------------------------------------------------------------
interface IncomingData {
  action: 'grade_completed' | 'activity_completed' | 'reward_earned' | 'level_up' | 'achievement_unlocked';
  student_id: string;
  data: {
    activity_type?: string;      // e.g., "quiz", "game", "practice"
    activity_name?: string;      // e.g., "Algebra Challenge Level 5"
    score?: number;              // 0-100 score if applicable
    xp_earned?: number;          // Experience points earned
    coins_earned?: number;       // Virtual currency earned
    new_level?: number;          // New level reached (for level_up action)
    achievement_name?: string;   // Name of achievement (for achievement_unlocked)
    topic_name?: string;         // Math topic associated with the activity
    timestamp?: string;          // When the event occurred (ISO string)
    [key: string]: unknown;      // Allow additional custom fields
  };
}

// -----------------------------------------------------------------------------
// MAIN REQUEST HANDLER
// -----------------------------------------------------------------------------
// This is the entry point for all incoming HTTP requests to this function.
// -----------------------------------------------------------------------------
serve(async (req) => {
  // ---------------------------------------------------------------------------
  // CORS PREFLIGHT HANDLING
  // ---------------------------------------------------------------------------
  // Browsers send an OPTIONS request before the actual POST to check if
  // cross-origin requests are allowed. We respond with CORS headers.
  // ---------------------------------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------------------------
    // STEP 1: EXTRACT API KEY FROM REQUEST HEADER
    // -------------------------------------------------------------------------
    // The sister app must include the API key in the x-api-key header.
    // If missing, we immediately reject the request.
    // -------------------------------------------------------------------------
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // STEP 2: CREATE SUPABASE ADMIN CLIENT
    // -------------------------------------------------------------------------
    // We use the service role key to bypass RLS (Row Level Security).
    // This is necessary because we're validating an API key, not a user session.
    // The service role key has full database access.
    // -------------------------------------------------------------------------
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // -------------------------------------------------------------------------
    // STEP 3: HASH THE INCOMING API KEY
    // -------------------------------------------------------------------------
    // We never store API keys in plain text for security reasons.
    // Instead, we store a SHA-256 hash of the key.
    // To validate, we hash the incoming key and compare to stored hashes.
    // 
    // Process:
    // 1. Encode the API key string to bytes
    // 2. Compute SHA-256 hash of those bytes
    // 3. Convert hash bytes to hexadecimal string for comparison
    // -------------------------------------------------------------------------
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // -------------------------------------------------------------------------
    // STEP 4: LOOK UP THE API KEY IN THE DATABASE
    // -------------------------------------------------------------------------
    // Search the teacher_api_keys table for a matching hash.
    // If found, we get the teacher_id to know whose account this key belongs to.
    // -------------------------------------------------------------------------
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('teacher_api_keys')
      .select('id, teacher_id, is_active')
      .eq('api_key_hash', apiKeyHash)
      .single();

    // If no matching key found, reject the request
    if (keyError || !keyRecord) {
      console.error('API key not found:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // STEP 5: CHECK IF THE API KEY IS ACTIVE
    // -------------------------------------------------------------------------
    // Teachers can disable their API keys without deleting them.
    // This allows temporary suspension of sister app access.
    // -------------------------------------------------------------------------
    if (!keyRecord.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // STEP 6: UPDATE LAST USED TIMESTAMP
    // -------------------------------------------------------------------------
    // Track when the API key was last used for monitoring purposes.
    // This helps teachers see if their key is actively being used.
    // -------------------------------------------------------------------------
    await supabaseAdmin
      .from('teacher_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    // -------------------------------------------------------------------------
    // STEP 7: PARSE AND VALIDATE REQUEST BODY
    // -------------------------------------------------------------------------
    // Extract the JSON payload from the request.
    // Validate that required fields (action, student_id) are present.
    // -------------------------------------------------------------------------
    const body: IncomingData = await req.json();
    
    if (!body.action || !body.student_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: action, student_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // STEP 8: LOG THE INCOMING DATA
    // -------------------------------------------------------------------------
    // Every request is logged to the sister_app_sync_log table.
    // This provides an audit trail and helps with debugging.
    // The log includes:
    //   - teacher_id: Whose API key was used
    //   - student_id: Which student the data is about
    //   - action: What type of event occurred
    //   - data: The full payload from the sister app
    //   - source_app: Identifies where the data came from
    //   - processed: Whether we've fully processed this data yet
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // STEP 9: PROCESS DATA BASED ON ACTION TYPE
    // -------------------------------------------------------------------------
    // Different actions may require different processing.
    // Currently, we save grade data to grade_history when applicable.
    // Other actions are just logged for now but could trigger additional logic.
    // -------------------------------------------------------------------------
    let processedResult = null;
    
    switch (body.action) {
      case 'grade_completed':
      case 'activity_completed':
        // ---------------------------------------------------------------------
        // GRADE/ACTIVITY COMPLETED PROCESSING
        // ---------------------------------------------------------------------
        // If the sister app sends a score and topic name, we can save it
        // to the grade_history table. This allows NYCLogic Ai to track
        // grades from both scanned work AND sister app activities.
        // ---------------------------------------------------------------------
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
        // ---------------------------------------------------------------------
        // REWARD/LEVEL/ACHIEVEMENT PROCESSING
        // ---------------------------------------------------------------------
        // These events don't require additional database writes.
        // They're logged for analytics and could trigger notifications later.
        // ---------------------------------------------------------------------
        processedResult = { logged: true };
        break;
    }

    // -------------------------------------------------------------------------
    // STEP 10: MARK LOG ENTRY AS PROCESSED
    // -------------------------------------------------------------------------
    // Update the log entry to indicate we've finished processing.
    // This helps identify any entries that failed mid-processing.
    // -------------------------------------------------------------------------
    await supabaseAdmin
      .from('sister_app_sync_log')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('id', logEntry.id);

    // -------------------------------------------------------------------------
    // STEP 11: RETURN SUCCESS RESPONSE
    // -------------------------------------------------------------------------
    // Let the sister app know the request was successful.
    // Include the log ID so they can reference it if needed.
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({ 
        success: true, 
        log_id: logEntry.id,
        processed: processedResult 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // -------------------------------------------------------------------------
    // ERROR HANDLING
    // -------------------------------------------------------------------------
    // Catch any unexpected errors and return a generic error response.
    // Log the actual error for debugging purposes.
    // -------------------------------------------------------------------------
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
