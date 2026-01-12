/**
 * ============================================================================
 * PUSH TO SISTER APP EDGE FUNCTION
 * ============================================================================
 * 
 * This function sends student grade data to the connected sister app (NYCologic Scholar).
 * 
 * REQUIRED SECRETS:
 * - SISTER_APP_API_KEY: The API key for authenticating with the sister app
 * - NYCOLOGIC_API_URL: The endpoint URL of the sister app (e.g., https://app.nycologic.com/api/receive)
 * 
 * DATA FLOW:
 * 1. ScanGenius analyzes student work and calculates a grade
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
  class_id: string;           // The class this data belongs to
  title: string;              // Assignment or activity title
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
    
    console.log('Pushing data to sister app:', JSON.stringify(requestData));
    console.log('Endpoint:', sisterAppEndpoint);

    // ========================================================================
    // SEND DATA TO SISTER APP
    // ========================================================================
    // Make POST request to the sister app's endpoint with the grade data
    const response = await fetch(sisterAppEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': sisterAppApiKey,  // Authenticate with the API key
      },
      body: JSON.stringify(requestData),
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
