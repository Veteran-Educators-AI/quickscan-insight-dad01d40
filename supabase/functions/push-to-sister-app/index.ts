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
  type?: 'ping' | 'grade' | 'behavior';   // Request type: 'ping' for connection test, 'grade' for actual data, 'behavior' for deductions
  class_id?: string;         // The class this data belongs to
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
  grade?: number;            // The grade (0-100)
  topic_name?: string;       // The topic/subject of the work
  questions?: any[];         // Generated remediation or mastery challenge questions
  // Behavior deduction fields
  xp_deduction?: number;     // XP to remove for behavior
  coin_deduction?: number;   // Coins to remove for behavior
  reason?: string;           // Reason for deduction
  notes?: string;            // Additional notes
}

/**
 * Convert internal push request to sister app expected format for grades
 * The receiving endpoint expects 'action' field, not 'type'
 */
function convertToSisterAppFormat(requestData: PushRequest) {
  return {
    action: 'grade_completed' as const,
    student_id: requestData.student_id,
    data: {
      activity_type: 'scan_analysis',
      activity_name: requestData.title,
      score: requestData.grade,
      xp_earned: requestData.xp_reward,
      coins_earned: requestData.coin_reward,
      topic_name: requestData.topic_name,
      description: requestData.description,
      standard_code: requestData.standard_code,
      class_id: requestData.class_id,
      student_name: requestData.student_name,
      printable_url: requestData.printable_url,
      due_at: requestData.due_at,
      questions: requestData.questions || [], // Include generated questions
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
    } else {
      // Handle grade completion (default)
      sisterAppPayload = convertToSisterAppFormat(requestData);
    }
    
    console.log('Sending payload to sister app:', JSON.stringify(sisterAppPayload));
    
    // Make POST request to the sister app's endpoint with the grade data
    const response = await fetch(sisterAppEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sisterAppApiKey,  // Authenticate with the API key
      },
      body: JSON.stringify(sisterAppPayload),
    });

    // Read the response
    const responseText = await response.text();
    
    // ========================================================================
    // HANDLE SISTER APP RESPONSE
    // ========================================================================
    // Check if the request was successful
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
