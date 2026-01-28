import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StruggleTopic {
  topic_name: string;
  standard: string | null;
  avg_grade: number;
  attempt_count: number;
  last_attempt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { classId, excludeTopics = [] } = await req.json();

    // Get recent grade history to find struggling topics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supabase
      .from("grade_history")
      .select("topic_name, nys_standard, grade, created_at, student_id")
      .eq("teacher_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    // If class specified, filter by students in that class
    if (classId) {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("class_id", classId);
      
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id);
        query = query.in("student_id", studentIds);
      }
    }

    const { data: gradeHistory, error: gradeError } = await query;

    if (gradeError) {
      console.error("Error fetching grade history:", gradeError);
      throw new Error("Failed to fetch grade history");
    }

    // Aggregate by topic
    const topicStats = new Map<string, {
      grades: number[];
      standard: string | null;
      lastAttempt: string;
    }>();

    for (const record of gradeHistory || []) {
      const existing = topicStats.get(record.topic_name);
      if (existing) {
        existing.grades.push(record.grade);
        if (record.created_at > existing.lastAttempt) {
          existing.lastAttempt = record.created_at;
        }
      } else {
        topicStats.set(record.topic_name, {
          grades: [record.grade],
          standard: record.nys_standard,
          lastAttempt: record.created_at,
        });
      }
    }

    // Calculate averages and filter for struggling topics (< 70%)
    const strugglingTopics: StruggleTopic[] = [];
    for (const [topicName, stats] of topicStats) {
      if (excludeTopics.includes(topicName)) continue;
      
      const avgGrade = stats.grades.reduce((a, b) => a + b, 0) / stats.grades.length;
      if (avgGrade < 70) {
        strugglingTopics.push({
          topic_name: topicName,
          standard: stats.standard,
          avg_grade: Math.round(avgGrade),
          attempt_count: stats.grades.length,
          last_attempt: stats.lastAttempt,
        });
      }
    }

    // Sort by lowest average first, then by most recent
    strugglingTopics.sort((a, b) => {
      if (a.avg_grade !== b.avg_grade) return a.avg_grade - b.avg_grade;
      return new Date(b.last_attempt).getTime() - new Date(a.last_attempt).getTime();
    });

    if (strugglingTopics.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          suggestion: null,
          message: "No struggling topics found - students are doing well!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick the topic with lowest average
    const suggestedTopic = strugglingTopics[0];

    // Generate a unique approval token
    const approvalToken = crypto.randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    // Create the suggestion record
    const { data: suggestion, error: insertError } = await supabase
      .from("simple_mode_suggestions")
      .insert({
        teacher_id: user.id,
        class_id: classId || null,
        suggested_topic: suggestedTopic.topic_name,
        suggested_standard: suggestedTopic.standard,
        reason: `Students averaged ${suggestedTopic.avg_grade}% on this topic across ${suggestedTopic.attempt_count} attempts. Focus on reinforcing core concepts.`,
        source_data: {
          avg_grade: suggestedTopic.avg_grade,
          attempt_count: suggestedTopic.attempt_count,
          last_attempt: suggestedTopic.last_attempt,
          all_struggling: strugglingTopics.slice(0, 5),
        },
        status: "pending",
        approval_token: approvalToken,
        token_expires_at: tokenExpiry.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating suggestion:", insertError);
      throw new Error("Failed to create suggestion");
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: {
          id: suggestion.id,
          topic: suggestedTopic.topic_name,
          standard: suggestedTopic.standard,
          reason: suggestion.reason,
          avgGrade: suggestedTopic.avg_grade,
          attemptCount: suggestedTopic.attempt_count,
          approvalToken,
          otherOptions: strugglingTopics.slice(1, 4),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-simple-mode-suggestion:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
