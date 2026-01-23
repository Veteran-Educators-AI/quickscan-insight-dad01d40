import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncPayload {
  type: "assignment_completed" | "student_progress" | "badge_earned" | "mastery_update";
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nycologicApiUrl = Deno.env.get("NYCOLOGIC_API_URL");

    if (!nycologicApiUrl) {
      return new Response(
        JSON.stringify({ error: "NYCOLOGIC_API_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: SyncPayload = await req.json();

    console.log(`Syncing ${payload.type} to NYCologic AI...`);

    // Send data to NYCologic AI parent app
    const response = await fetch(nycologicApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-source-app": "scholar-app",
      },
      body: JSON.stringify({
        source: "scholar-app",
        timestamp: new Date().toISOString(),
        event_type: payload.type,
        data: payload.data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NYCologic API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to sync with NYCologic", 
          status: response.status,
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("Sync successful:", result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_at: new Date().toISOString(),
        nycologic_response: result 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
