import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, action } = await req.json();

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "Missing token or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the suggestion by token
    const { data: suggestion, error: findError } = await supabase
      .from("simple_mode_suggestions")
      .select("*")
      .eq("approval_token", token)
      .single();

    if (findError || !suggestion) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token expired
    if (new Date(suggestion.token_expires_at) < new Date()) {
      await supabase
        .from("simple_mode_suggestions")
        .update({ status: "expired" })
        .eq("id", suggestion.id);

      return new Response(JSON.stringify({ error: "Token has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already processed
    if (suggestion.status !== "pending") {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          status: suggestion.status,
          message: `This suggestion was already ${suggestion.status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      // Update status to approved
      await supabase
        .from("simple_mode_suggestions")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", suggestion.id);

      return new Response(
        JSON.stringify({
          success: true,
          action: "approved",
          suggestionId: suggestion.id,
          topic: suggestion.suggested_topic,
          standard: suggestion.suggested_standard,
          teacherId: suggestion.teacher_id,
          classId: suggestion.class_id,
          message: "Lesson approved! Generating materials...",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "reject") {
      // Update status to rejected
      await supabase
        .from("simple_mode_suggestions")
        .update({ status: "rejected" })
        .eq("id", suggestion.id);

      // Get previously rejected topics to exclude
      const { data: rejectedSuggestions } = await supabase
        .from("simple_mode_suggestions")
        .select("suggested_topic")
        .eq("teacher_id", suggestion.teacher_id)
        .eq("status", "rejected")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const excludeTopics = rejectedSuggestions?.map(s => s.suggested_topic) || [];

      return new Response(
        JSON.stringify({
          success: true,
          action: "rejected",
          teacherId: suggestion.teacher_id,
          classId: suggestion.class_id,
          excludeTopics,
          message: "Suggestion rejected. Generate a new one.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in handle-simple-mode-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
