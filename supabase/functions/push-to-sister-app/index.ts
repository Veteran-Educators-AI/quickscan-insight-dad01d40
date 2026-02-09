/**
 * ============================================================================
 * PUSH TO SISTER APP EDGE FUNCTION
 * ============================================================================
 * 
 * This function sends student grade data to the connected sister app (NYClogic Scholar Ai).
 * 
 * NOTE: For direct database sync, use the shared_assignments table instead.
 * This function is kept for backwards compatibility with external API integrations.
 * 
 * REQUIRED SECRETS:
 * - SISTER_APP_API_KEY: The API key for authenticating with the sister app
 * - NYCOLOGIC_API_URL: The endpoint URL of the sister app (e.g., https://app.nycologic.com/api/receive)
 * 
 * DATA FLOW:
 * 1. NYCLogic Ai analyzes student work and calculates a grade
 * 2. If sister app sync is enabled, this function is called
 * 3. Grade data is converted to XP/coins using configured multipliers
 * 4. Data is pushed to the sister app for gamification rewards
 * 
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers required for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Interface for the data being pushed to the sister app
 * Contains class info, assignment details, and student grade data
 */
interface PushRequest {
  type?: 'ping' | 'grade' | 'behavior' | 'student_created' | 'student_updated' | 'roster_sync' | 'live_session_completed' | 'assignment_push';   // Request type
  source?: 'scan_genius' | 'scan_analysis' | 'assignment_push' | 'tutorial_push';  // Source identifier for sister app
  class_id?: string;         // The class this data belongs to
  class_name?: string;       // The class name
  title?: string;            // Assignment or activity title
  description?: string;       // Optional description
  due_at?: string;           // Optional due date
  standard_code?: string;    // Optional learning standard code
  xp_reward?: number;        // XP reward calculated from grade
  coin_reward?: number;      // Coin reward calculated from grade
  printable_url?: string;    // Optional link to printable worksheet
  // Student-specific fields for individual grade pushes
  student_id?: string;       // The student's ID
  student_name?: string;     // The student's name
  student_email?: string;    // The student's email
  first_name?: string;       // Student first name
  last_name?: string;        // Student last name
  grade?: number;            // The grade (0-100)
  topic_name?: string;       // The topic/subject of the work
  questions?: any[];         // Generated remediation or mastery challenge questions
  remediation_recommendations?: string[];  // Recommended topics for remediation
  difficulty_level?: string;  // A, B, C, D, E, or F difficulty
  // Behavior deduction fields
  xp_deduction?: number;     // XP to remove for behavior
  coin_deduction?: number;   // Coins to remove for behavior
  reason?: string;           // Reason for deduction
  notes?: string;            // Additional notes
  // Live session fields
  session_code?: string;           // Session join code
  participation_mode?: string;     // 'individual' or 'pairs'
  credit_for_participation?: number;
  deduction_for_non_participation?: number;
  total_participants?: number;
  active_participants?: number;
  participant_results?: ParticipantResult[];
}

interface ParticipantResult {
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

/**
 * Convert internal push request to sister app expected format for grades
 * The receiving endpoint expects 'action' field, not 'type'
 */
function convertToSisterAppFormat(requestData: PushRequest) {
  // Determine activity type/source - 'assignment_push' for pushed assignments, 'scan_analysis' for scanned work
  const activityType = requestData.source || 
    (requestData.type === 'assignment_push' ? 'scan_genius' : 'scan_analysis');
  
  return {
    action: 'grade_completed' as const,
    student_id: requestData.student_id,
    data: {
      source: activityType,  // Proper source identifier for sister app
      activity_type: activityType,
      activity_name: requestData.title,
      score: requestData.grade,
      xp_earned: requestData.xp_reward,
      coins_earned: requestData.coin_reward,
      topic_name: requestData.topic_name,
      description: requestData.description,
      standard_code: requestData.standard_code,
      class_id: requestData.class_id,
      class_name: requestData.class_name,
      student_name: requestData.student_name,
      student_email: requestData.student_email,
      printable_url: requestData.printable_url,
      due_at: requestData.due_at,
      questions: requestData.questions || [], // Include generated questions
      remediation_recommendations: requestData.remediation_recommendations || [], // Topics to practice
      difficulty_level: requestData.difficulty_level,
      timestamp: new Date().toISOString(),
    }
  };
}

/**
 * Convert behavior deduction request to sister app format
 * Uses negative values for XP/coins to indicate deduction
 */
function convertToBehaviorFormat(requestData: PushRequest) {
  return {
    action: 'behavior_deduction' as const,
    student_id: requestData.student_id,
    data: {
      activity_type: 'behavior_consequence',
      activity_name: `Behavior: ${requestData.reason}`,
      xp_deducted: requestData.xp_deduction || 0,
      coins_deducted: requestData.coin_deduction || 0,
      // Also send as negative earned values for backward compatibility
      xp_earned: -(requestData.xp_deduction || 0),
      coins_earned: -(requestData.coin_deduction || 0),
      reason: requestData.reason,
      notes: requestData.notes,
      class_id: requestData.class_id,
      student_name: requestData.student_name,
      timestamp: new Date().toISOString(),
    }
  };
}

/**
 * Convert student creation request to sister app format
 * Sends new student info to sync roster with sister app
 */
function convertToStudentCreatedFormat(requestData: PushRequest) {
  return {
    action: 'student_created' as const,
    student_id: requestData.student_id,
    data: {
      student_id: requestData.student_id, // Also include in data object for API compatibility
      first_name: requestData.first_name,
      last_name: requestData.last_name,
      student_name: requestData.student_name,
      email: requestData.student_email,
      class_id: requestData.class_id,
      class_name: requestData.class_name,
      timestamp: new Date().toISOString(),
    }
  };
}

/**
 * Convert student update request to sister app format
 * Sends updated student info to sync roster with sister app
 */
function convertToStudentUpdatedFormat(requestData: PushRequest) {
  return {
    action: 'student_updated' as const,
    student_id: requestData.student_id,
    data: {
      student_id: requestData.student_id, // Also include in data object for API compatibility
      first_name: requestData.first_name,
      last_name: requestData.last_name,
      student_name: requestData.student_name,
      email: requestData.student_email,
      class_id: requestData.class_id,
      class_name: requestData.class_name,
      timestamp: new Date().toISOString(),
    }
  };
}

/**
 * Convert live session completed request to sister app format
 * Sends full participation and answer data for all students
 */
function convertToLiveSessionFormat(requestData: PushRequest) {
  return {
    action: 'live_session_completed' as const,
    data: {
      activity_type: 'live_presentation',
      activity_name: requestData.title,
      topic_name: requestData.topic_name,
      description: requestData.description,
      class_id: requestData.class_id,
      session_code: requestData.session_code,
      participation_mode: requestData.participation_mode,
      credit_for_participation: requestData.credit_for_participation,
      deduction_for_non_participation: requestData.deduction_for_non_participation,
      total_participants: requestData.total_participants,
      active_participants: requestData.active_participants,
      participant_results: requestData.participant_results || [],
      timestamp: new Date().toISOString(),
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // RETRIEVE REQUIRED SECRETS
    // ========================================================================
    // Get the API key for authenticating with the sister app
    const sisterAppApiKey = Deno.env.get('SISTER_APP_API_KEY');
    // Get the sister app endpoint URL from secrets (configurable per deployment)
    const sisterAppEndpoint = Deno.env.get('NYCOLOGIC_API_URL');
    
    // Validate that the API key is configured
    if (!sisterAppApiKey) {
      console.error('SISTER_APP_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Sister app API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the endpoint URL is configured
    if (!sisterAppEndpoint) {
      console.error('NYCOLOGIC_API_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Sister app endpoint URL not configured. Please add NYCOLOGIC_API_URL secret.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // PARSE AND VALIDATE REQUEST DATA
    // ========================================================================
    const requestData: PushRequest = await req.json();
    
    console.log('Received request:', JSON.stringify(requestData));
    console.log('Endpoint:', sisterAppEndpoint);

    // ========================================================================
    // HANDLE PING/TEST REQUESTS LOCALLY
    // ========================================================================
    // For connection tests, we just verify that secrets are configured
    // and return success without hitting the sister app
    if (requestData.type === 'ping') {
      console.log('Ping request - verifying configuration');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Connection configured correctly',
          endpoint: sisterAppEndpoint 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // SEND DATA TO SISTER APP
    // ========================================================================
    // Convert to the format expected by receive-sister-app-data
    // The receiving endpoint expects 'action' field (e.g., 'grade_completed' or 'behavior_deduction')
    // NOT 'type' field which was causing "Unknown payload type" error
    let sisterAppPayload;
    
    if (requestData.type === 'behavior') {
      // Handle behavior deduction - sends negative XP/coins
      console.log('Processing behavior deduction request');
      sisterAppPayload = convertToBehaviorFormat(requestData);
    } else if (requestData.type === 'student_created' || requestData.type === 'roster_sync') {
      // Handle new student creation - sync roster
      console.log('Processing student creation/roster sync request');
      sisterAppPayload = convertToStudentCreatedFormat(requestData);
    } else if (requestData.type === 'student_updated') {
      // Handle student update - sync roster changes
      console.log('Processing student update request');
      sisterAppPayload = convertToStudentUpdatedFormat(requestData);
    } else if (requestData.type === 'live_session_completed') {
      // Handle live session results
      console.log('Processing live session completed request');
      sisterAppPayload = convertToLiveSessionFormat(requestData);
    } else {
      // Handle grade completion (default)
      sisterAppPayload = convertToSisterAppFormat(requestData);
    }
    
    console.log('Sending payload to sister app:', JSON.stringify(sisterAppPayload));
    
    // Make POST request to the sister app's endpoint with the grade data
    // Use a timeout to prevent hanging if the sister app is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let response: Response;
    try {
      response = await fetch(sisterAppEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': sisterAppApiKey,  // Authenticate with the API key
        },
        body: JSON.stringify(sisterAppPayload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const isTimeout = fetchError instanceof DOMException && fetchError.name === 'AbortError';
      const errorMsg = isTimeout 
        ? 'Sister app request timed out after 15 seconds'
        : `Network error connecting to sister app: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`;
      
      console.error(errorMsg);
      
      // Return a soft failure - don't use 5xx status so the caller knows it was a network issue
      // not a bug in our code
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          retriable: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Read the response
    const responseText = await response.text();
    
    // ========================================================================
    // HANDLE SISTER APP RESPONSE
    // ========================================================================
    // Check if the request was successful
    if (!response.ok) {
      console.error('Sister app error:', response.status, responseText);
      
      // Return 200 with success:false instead of forwarding the error status
      // This prevents the caller (grade save flow) from thinking the entire operation failed
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sister app returned an error',
          status: response.status,
          details: responseText,
          retriable: response.status >= 500,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse response as JSON, fall back to raw text if not valid JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('Sister app response:', responseData);

    // Return success with the sister app's response
    return new Response(
      JSON.stringify({ success: true, response: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    console.error('Error in push-to-sister-app:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
