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
  action: 'grade_completed' | 'activity_completed' | 'reward_earned' | 'level_up' | 'achievement_unlocked' | 'batch_sync' | 'behavior_deduction' | 'live_session_completed' | 'roster_sync' | 'student_created' | 'student_updated';
  student_id?: string; // Optional for batch_sync and live_session_completed
  data?: {
    activity_type?: string;      // e.g., "quiz", "game", "practice", "live_presentation"
    activity_name?: string;      // e.g., "Algebra Challenge Level 5"
    score?: number;              // 0-100 score if applicable
    xp_earned?: number;          // Experience points earned
    coins_earned?: number;       // Virtual currency earned
    new_level?: number;          // New level reached (for level_up action)
    achievement_name?: string;   // Name of achievement (for achievement_unlocked)
    topic_name?: string;         // Math topic associated with the activity
    timestamp?: string;          // When the event occurred (ISO string)
    // Live session specific fields
    session_code?: string;
    participation_mode?: string;
    credit_for_participation?: number;
    deduction_for_non_participation?: number;
    total_participants?: number;
    active_participants?: number;
    participant_results?: LiveSessionParticipantResult[];
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

interface LiveSessionParticipantResult {
  student_id: string;
  student_name: string;
  total_questions_answered: number;
  correct_answers: number;
  accuracy: number;
  credit_awarded: number;
  participated: boolean;
  answers: {
    selected_answer: string;
    is_correct: boolean | null;
    time_taken_seconds: number | null;
  }[];
}

interface StudentLearningProfile {
  student_id: string;
  student_name: string;
  student_email: string | null;  // Email for auto-linking on Scholar signup
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
    standard: string | null;  // NYS standard code (e.g., "A.REI.4")
    problem_set: string | null;  // Worksheet/problem set title
    severity: string | null;  // high, medium, low
    suggested_remedies: string[] | null;
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
    // Try api_key_hash first (new column name), fall back to key_hash (original column name)
    let keyRecord: any = null;
    let keyError: any = null;

    const { data: keyData1, error: keyErr1 } = await supabaseAdmin
      .from('teacher_api_keys')
      .select('id, teacher_id, is_active')
      .eq('api_key_hash', apiKeyHash)
      .maybeSingle();

    if (keyData1) {
      keyRecord = keyData1;
    } else {
      // Fallback: try original column name 'key_hash'
      const { data: keyData2, error: keyErr2 } = await supabaseAdmin
        .from('teacher_api_keys')
        .select('id, teacher_id, is_active')
        .eq('key_hash', apiKeyHash)
        .maybeSingle();
      keyRecord = keyData2;
      keyError = keyErr2;
    }

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

    // For batch_sync and live_session_completed, validate differently
    if (body.action === 'batch_sync') {
      if (!body.student_profiles || body.student_profiles.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'batch_sync requires student_profiles array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'live_session_completed') {
      // live_session_completed doesn't need student_id, uses participant_results array
      if (!body.data?.participant_results) {
        return new Response(
          JSON.stringify({ success: false, error: 'live_session_completed requires data.participant_results array' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'roster_sync' || body.action === 'student_created' || body.action === 'student_updated') {
      // roster_sync can have student_id at root or in data object
      const studentId = body.student_id || body.data?.student_id;
      if (!studentId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required field: student_id (in root or data object)' }),
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

    if (body.action === 'live_session_completed') {
      // ---------------------------------------------------------------------
      // LIVE SESSION PROCESSING
      // ---------------------------------------------------------------------
      // Process live presentation session results from sister app
      // Saves participation data for each student
      // ---------------------------------------------------------------------
      console.log('Processing live session completed:', body.data);
      
      const participantResults = body.data?.participant_results || [];
      let participantsProcessed = 0;
      let gradesCreated = 0;

      for (const participant of participantResults) {
        participantsProcessed++;
        
        // Log each participant's results (non-fatal if logging fails)
        try {
          await supabaseAdmin.from('sister_app_sync_log').insert({
            teacher_id: keyRecord.teacher_id,
            student_id: participant.student_id,
            action: 'live_session_participation',
            data: {
              activity_name: body.data?.activity_name,
              topic_name: body.data?.topic_name,
              student_name: participant.student_name,
              total_questions_answered: participant.total_questions_answered,
              correct_answers: participant.correct_answers,
              accuracy: participant.accuracy,
              credit_awarded: participant.credit_awarded,
              participated: participant.participated,
              answers: participant.answers,
              session_code: body.data?.session_code,
            },
            source_app: 'scholar_app',
            processed: true,
            processed_at: new Date().toISOString(),
          });
        } catch (logErr) {
          console.error('Non-fatal: Failed to log participant sync:', logErr);
        }

        // If participated, create a grade entry for tracking
        if (participant.participated && participant.total_questions_answered > 0) {
          const { error: gradeError } = await supabaseAdmin
            .from('grade_history')
            .insert({
              student_id: participant.student_id,
              teacher_id: keyRecord.teacher_id,
              topic_name: body.data?.topic_name || 'Live Session',
              grade: participant.accuracy,
              grade_justification: `Live session participation: ${participant.correct_answers}/${participant.total_questions_answered} correct (${body.data?.activity_name || 'Session'})`,
            });

          if (!gradeError) {
            gradesCreated++;
          } else {
            console.error('Error saving live session grade:', gradeError);
          }
        }
      }

      // Log the session summary
      const { data: summaryLog } = await supabaseAdmin
        .from('sister_app_sync_log')
        .insert({
          teacher_id: keyRecord.teacher_id,
          action: 'live_session_completed',
          data: {
            activity_name: body.data?.activity_name,
            topic_name: body.data?.topic_name,
            session_code: body.data?.session_code,
            total_participants: body.data?.total_participants,
            active_participants: body.data?.active_participants,
            participants_processed: participantsProcessed,
            grades_created: gradesCreated,
          },
          source_app: 'scholar_app',
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      logEntry = summaryLog;
      processedResult = {
        live_session_processed: true,
        participants_synced: participantsProcessed,
        grades_created: gradesCreated,
        message: `Processed ${participantsProcessed} participant results from live session`,
      };

    } else if (body.action === 'batch_sync') {
      // ---------------------------------------------------------------------
      // BATCH SYNC PROCESSING
      // ---------------------------------------------------------------------
      // Process comprehensive learning profiles from NYCLogic AI
      // This includes grades, misconceptions, weak topics, and remediation
      // IMPORTANT: Persist actual data, not just logs!
      // ---------------------------------------------------------------------
      console.log('Processing batch sync with FULL data persistence:', body.summary);
      console.log('First student sample:', JSON.stringify(body.student_profiles?.[0] ? {
        student_id: body.student_profiles[0].student_id,
        student_name: body.student_profiles[0].student_name,
        overall_average: body.student_profiles[0].overall_average,
        grades_count: body.student_profiles[0].grades?.length || 0,
        weak_topics_count: body.student_profiles[0].weak_topics?.length || 0,
        misconceptions_count: body.student_profiles[0].misconceptions?.length || 0,
        sample_grade: body.student_profiles[0].grades?.[0] || null,
      } : 'No profiles'));

      const profiles = body.student_profiles!;
      let gradesProcessed = 0;
      let gradesSaved = 0;
      let misconceptionsProcessed = 0;
      let misconceptionsSaved = 0;
      let remediationsCreated = 0;

      for (const profile of profiles) {
        // ===================================================================
        // PERSIST ACTUAL GRADE HISTORY ENTRIES
        // ===================================================================
        if (profile.grades && profile.grades.length > 0) {
          for (const grade of profile.grades) {
            gradesProcessed++;
            
            // Check if this grade already exists (avoid duplicates)
            const { data: existingGrade } = await supabaseAdmin
              .from('grade_history')
              .select('id')
              .eq('student_id', profile.student_id)
              .eq('topic_name', grade.topic_name)
              .eq('created_at', grade.created_at)
              .maybeSingle();

            if (!existingGrade) {
              const { error: gradeError } = await supabaseAdmin
                .from('grade_history')
                .insert({
                  student_id: profile.student_id,
                  teacher_id: keyRecord.teacher_id,
                  topic_name: grade.topic_name,
                  grade: grade.grade,
                  regents_score: grade.regents_score,
                  nys_standard: grade.nys_standard,
                  grade_justification: grade.grade_justification || `Synced from ScanGenius: ${grade.topic_name}`,
                  created_at: grade.created_at,
                });

              if (gradeError) {
                console.error('Error saving grade:', gradeError.message);
              } else {
                gradesSaved++;
              }
            }
          }
        }

        // ===================================================================
        // PERSIST MISCONCEPTIONS DATA
        // ===================================================================
        if (profile.misconceptions && profile.misconceptions.length > 0) {
          for (const misconception of profile.misconceptions) {
            misconceptionsProcessed++;
            
            // Check if this misconception already exists
            const { data: existingMis } = await supabaseAdmin
              .from('analysis_misconceptions')
              .select('id')
              .eq('student_id', profile.student_id)
              .eq('misconception_text', misconception.name)
              .eq('topic_name', misconception.topic_name || 'General')
              .maybeSingle();

            if (!existingMis) {
              const { error: misError } = await supabaseAdmin
                .from('analysis_misconceptions')
                .insert({
                  student_id: profile.student_id,
                  teacher_id: keyRecord.teacher_id,
                  topic_name: misconception.topic_name || 'General',
                  misconception_text: misconception.name,
                  severity: misconception.severity,
                  suggested_remedies: misconception.suggested_remedies,
                });

              if (misError) {
                console.error('Error saving misconception:', misError.message);
              } else {
                misconceptionsSaved++;
              }
            }
          }
        }

        // ===================================================================
        // LOG COMPREHENSIVE STUDENT PROFILE WITH ALL DATA
        // ===================================================================
        await supabaseAdmin.from('sister_app_sync_log').insert({
          teacher_id: keyRecord.teacher_id,
          student_id: profile.student_id,
          action: 'batch_sync_student',
          data: {
            student_name: profile.student_name,
            student_email: profile.student_email,
            overall_average: profile.overall_average,
            grades_count: profile.grades?.length || 0,
            grades_saved: gradesSaved,
            misconceptions_count: profile.misconceptions?.length || 0,
            misconceptions_saved: misconceptionsSaved,
            weak_topics: profile.weak_topics,
            recommended_remediation: profile.recommended_remediation,
            xp_potential: profile.xp_potential,
            coin_potential: profile.coin_potential,
            // Include sample data for debugging
            sample_grades: profile.grades?.slice(0, 3) || [],
            sample_misconceptions: profile.misconceptions?.slice(0, 3) || [],
          },
          source_app: 'nycologic_ai',
          processed: true,
          processed_at: new Date().toISOString(),
        });

        if (profile.recommended_remediation && profile.recommended_remediation.length > 0) {
          remediationsCreated++;
        }
      }

      console.log(`Batch sync complete: ${gradesSaved}/${gradesProcessed} grades saved, ${misconceptionsSaved}/${misconceptionsProcessed} misconceptions saved`);

      // Log the batch sync summary with actual save counts
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
            grades_saved: gradesSaved,
            misconceptions_processed: misconceptionsProcessed,
            misconceptions_saved: misconceptionsSaved,
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
        grades_saved: gradesSaved,
        misconceptions_received: misconceptionsProcessed,
        misconceptions_saved: misconceptionsSaved,
        remediations_queued: remediationsCreated,
        message: `Persisted ${gradesSaved} grades and ${misconceptionsSaved} misconceptions to database`,
      };

    } else if (body.action === 'roster_sync' || body.action === 'student_created' || body.action === 'student_updated') {
      // ---------------------------------------------------------------------
      // ROSTER SYNC PROCESSING
      // ---------------------------------------------------------------------
      // Handle roster data coming FROM the Scholar app
      // This allows Scholar to push student info back to NYCLogic Ai
      // ---------------------------------------------------------------------
      console.log('Processing roster sync from Scholar:', body.action, body.data || body.student_id);
      
      const studentData = body.data || {};
      const studentId = body.student_id || studentData.student_id;
      
      // Log the roster sync event
      const { data: rosterLog } = await supabaseAdmin
        .from('sister_app_sync_log')
        .insert({
          teacher_id: keyRecord.teacher_id,
          student_id: studentId,
          action: body.action,
          data: {
            student_id: studentId,
            first_name: studentData.first_name,
            last_name: studentData.last_name,
            student_name: studentData.student_name,
            email: studentData.email,
            class_id: studentData.class_id,
            class_name: studentData.class_name,
            source_action: body.action,
          },
          source_app: 'scholar_app',
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single();

      logEntry = rosterLog;
      processedResult = {
        roster_sync_received: true,
        student_id: studentId,
        action: body.action,
        message: `Roster sync logged for student: ${studentData.student_name || studentId}`,
      };

    } else {
      // ---------------------------------------------------------------------
      // SINGLE EVENT PROCESSING (original behavior)
      // ---------------------------------------------------------------------
      const { data: singleLogEntry, error: logError } = await supabaseAdmin
        .from('sister_app_sync_log')
        .insert({
          teacher_id: keyRecord.teacher_id,
          student_id: body.student_id || null,
          action: body.action,
          data: body.data || {},
          source_app: 'sister_app',
          processed: false,
        })
        .select()
        .single();

      if (logError) {
        // Log the error but don't fail the request - the sync log is secondary
        // to actually processing the incoming data. Previous versions would
        // return 500 here, causing the sister app to think the sync failed.
        console.error('Error logging sync data (non-fatal):', logError);
        console.error('Will continue processing the request despite log failure');
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

        case 'behavior_deduction':
          // Log behavior deduction - Scholar app will handle the actual point removal
          console.log('Behavior deduction received:', body.data);
          const xpVal = body.data?.xp_deducted || (body.data?.xp_earned ? Math.abs(body.data.xp_earned) : 0);
          const coinVal = body.data?.coins_deducted || (body.data?.coins_earned ? Math.abs(body.data.coins_earned) : 0);
          processedResult = { 
            logged: true, 
            behavior_recorded: true,
            xp_deducted: xpVal,
            coins_deducted: coinVal,
          };
          break;
      }

      // Mark single event as processed (only if log entry was created)
      if (logEntry?.id) {
        await supabaseAdmin
          .from('sister_app_sync_log')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq('id', logEntry.id);
      }
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
