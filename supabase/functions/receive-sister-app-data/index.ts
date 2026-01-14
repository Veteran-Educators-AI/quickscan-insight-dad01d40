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
  action: 'grade_completed' | 'activity_completed' | 'reward_earned' | 'level_up' | 'achievement_unlocked' | 'batch_sync';
  student_id?: string; // Optional for batch_sync
  data?: {
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
  // Batch sync fields (when action === 'batch_sync')
  teacher_id?: string;
  teacher_name?: string | null;
  sync_timestamp?: string;
  student_profiles?: StudentLearningProfile[];
  summary?: {
    total_students: number;
    total_grades: number;
    total_misconceptions: number;
    weak_topics_identified: number;
  };
}

interface StudentLearningProfile {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  overall_average: number;
  grades: {
    topic_name: string;
    grade: number;
    regents_score: number | null;
    nys_standard: string | null;
    grade_justification: string | null;
    created_at: string;
  }[];
  misconceptions: {
    name: string;
    description: string | null;
    confidence: number | null;
    topic_name: string | null;
  }[];
  weak_topics: { topic_name: string; avg_score: number }[];
  recommended_remediation: string[];
  xp_potential: number;
  coin_potential: number;
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
    // Validate that required fields are present based on action type.
    // -------------------------------------------------------------------------
    const body: IncomingData = await req.json();
    
    if (!body.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For batch_sync, validate differently
    if (body.action === 'batch_sync') {
      if (!body.student_profiles || body.student_profiles.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'batch_sync requires student_profiles array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!body.student_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: student_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -------------------------------------------------------------------------
    // STEP 8: PROCESS BASED ON ACTION TYPE
    // -------------------------------------------------------------------------
    let processedResult: any = null;
    let logEntry: any = null;

    if (body.action === 'batch_sync') {
      // ---------------------------------------------------------------------
      // BATCH SYNC PROCESSING
      // ---------------------------------------------------------------------
      // Process comprehensive learning profiles from NYCLogic AI
      // This includes grades, misconceptions, weak topics, and remediation
      // ---------------------------------------------------------------------
      console.log('Processing batch sync:', body.summary);

      const profiles = body.student_profiles!;
      let gradesProcessed = 0;
      let remediationsCreated = 0;

      for (const profile of profiles) {
        // Log each student's sync
        await supabaseAdmin.from('sister_app_sync_log').insert({
          teacher_id: keyRecord.teacher_id,
          student_id: profile.student_id,
          action: 'batch_sync_student',
          data: {
            student_name: profile.student_name,
            overall_average: profile.overall_average,
            grades_count: profile.grades.length,
            misconceptions_count: profile.misconceptions.length,
            weak_topics: profile.weak_topics,
            recommended_remediation: profile.recommended_remediation,
            xp_potential: profile.xp_potential,
            coin_potential: profile.coin_potential,
          },
          source_app: 'nycologic_ai',
          processed: true,
          processed_at: new Date().toISOString(),
        });

        gradesProcessed += profile.grades.length;

        // Here Scholar would:
        // 1. Create targeted practice assignments based on weak_topics
        // 2. Track misconceptions for student progress views
        // 3. Set up XP/coin rewards for improvement
        // 4. Generate personalized learning paths
        
        // For now, we log it - the actual Scholar app would implement these
        if (profile.recommended_remediation.length > 0) {
          remediationsCreated++;
        }
      }

      // Log the batch sync summary
      const { data: summaryLog } = await supabaseAdmin
        .from('sister_app_sync_log')
        .insert({
          teacher_id: keyRecord.teacher_id,
          action: 'batch_sync',
          data: {
            summary: body.summary,
            teacher_name: body.teacher_name,
            sync_timestamp: body.sync_timestamp,
            profiles_processed: profiles.length,
            grades_processed: gradesProcessed,
          },
          source_app: 'nycologic_ai',
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      logEntry = summaryLog;

      processedResult = {
        batch_processed: true,
        students_synced: profiles.length,
        grades_received: gradesProcessed,
        remediations_queued: remediationsCreated,
        message: 'Scholar will auto-assign remediation, track misconceptions, and award XP for improvement',
      };

    } else {
      // ---------------------------------------------------------------------
      // SINGLE EVENT PROCESSING (original behavior)
      // ---------------------------------------------------------------------
      const { data: singleLogEntry, error: logError } = await supabaseAdmin
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

      logEntry = singleLogEntry;

      switch (body.action) {
        case 'grade_completed':
        case 'activity_completed':
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
          processedResult = { logged: true };
          break;
      }

      // Mark single event as processed
      await supabaseAdmin
        .from('sister_app_sync_log')
        .update({ 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', logEntry.id);
    }

    // -------------------------------------------------------------------------
    // STEP 10: RETURN SUCCESS RESPONSE
    // -------------------------------------------------------------------------
    // Let the sender know the request was successful.
    // Include the log ID and processing result.
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({ 
        success: true, 
        log_id: logEntry?.id,
        processed: processedResult 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
