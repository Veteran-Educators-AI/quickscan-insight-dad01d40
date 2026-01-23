import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key", code: "MISSING_API_KEY" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the API key and verify
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Look up the token
    const { data: tokenData, error: tokenError } = await supabase
      .from("api_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", code: "INVALID_API_KEY" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "API key expired", code: "EXPIRED_API_KEY" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last used
    await supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Parse the URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const endpoint = pathParts[pathParts.length - 1]; // e.g., "students", "standards", etc.

    // Route to appropriate handler
    switch (req.method) {
      case "GET":
        return await handleGet(supabase, endpoint, url, tokenData, corsHeaders);
      case "POST":
        return await handlePost(supabase, endpoint, req, tokenData, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleGet(
  supabase: any,
  endpoint: string,
  url: URL,
  token: any,
  corsHeaders: Record<string, string>
) {
  const scopes = token.scopes || [];
  
  if (!scopes.includes("read") && !scopes.includes("admin")) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions", required: "read" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  switch (endpoint) {
    case "students": {
      const classId = url.searchParams.get("class_id");
      let query = supabase
        .from("enrollments")
        .select(`
          student_id,
          enrolled_at,
          class:classes(id, name, grade_band),
          profile:profiles!enrollments_student_id_fkey(full_name, avatar_url),
          student_profile:student_profiles!enrollments_student_id_fkey(xp, coins, current_streak, grade_level)
        `);
      
      if (classId) {
        query = query.eq("class_id", classId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    case "standards": {
      const gradeBand = url.searchParams.get("grade_band");
      const subject = url.searchParams.get("subject");
      
      let query = supabase.from("nys_standards").select("*");
      if (gradeBand) query = query.eq("grade_band", gradeBand);
      if (subject) query = query.eq("subject", subject);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    case "mastery": {
      const studentId = url.searchParams.get("student_id");
      const standardId = url.searchParams.get("standard_id");
      
      let query = supabase
        .from("student_standard_mastery")
        .select(`
          *,
          standard:nys_standards(code, subject, domain, standard_text)
        `);
      
      if (studentId) query = query.eq("student_id", studentId);
      if (standardId) query = query.eq("standard_id", standardId);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    case "assignments": {
      const classId = url.searchParams.get("class_id");
      const status = url.searchParams.get("status");
      
      let query = supabase
        .from("assignments")
        .select(`
          *,
          standard:nys_standards(code, subject, domain, standard_text)
        `);
      
      if (classId) query = query.eq("class_id", classId);
      if (status) query = query.eq("status", status);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    case "classes": {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", token.created_by);
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    default:
      return new Response(
        JSON.stringify({ 
          error: "Unknown endpoint",
          available_endpoints: ["students", "standards", "mastery", "assignments", "classes"]
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }
}

async function handlePost(
  supabase: any,
  endpoint: string,
  req: Request,
  token: any,
  corsHeaders: Record<string, string>
) {
  const scopes = token.scopes || [];
  
  if (!scopes.includes("write") && !scopes.includes("admin")) {
    return new Response(
      JSON.stringify({ error: "Insufficient permissions", required: "write" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();

  switch (endpoint) {
    case "assignments": {
      const { title, description, class_id, due_at, xp_reward, coin_reward, standard_id, subject } = body;
      
      if (!title || !class_id || !due_at) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: title, class_id, due_at" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          title,
          description,
          class_id,
          due_at,
          xp_reward: xp_reward || 50,
          coin_reward: coin_reward || 10,
          standard_id,
          subject,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ data, message: "Assignment created successfully" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    case "sync-student": {
      // Sync student data from external system
      const { external_id, name, email, grade_level, class_code } = body;
      
      // This would be used by external systems like Scan Genius to sync student data
      return new Response(
        JSON.stringify({ 
          message: "Student sync endpoint ready",
          received: { external_id, name, email, grade_level, class_code }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    default:
      return new Response(
        JSON.stringify({ 
          error: "Unknown endpoint",
          available_endpoints: ["assignments", "sync-student"]
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }
}
