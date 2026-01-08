import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface StudentAnalytics {
  student_id: string;
  student_name: string;
  class_name: string;
  overall_score: number;
  total_attempts: number;
  topic_performance: {
    topic: string;
    score_percentage: number;
    attempts: number;
  }[];
  misconceptions: {
    name: string;
    description: string | null;
    frequency: number;
  }[];
  recent_attempts: {
    question_id: string;
    question_text: string | null;
    score_earned: number;
    score_possible: number;
    date: string;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const studentId = url.searchParams.get("student_id");
    const teacherId = url.searchParams.get("teacher_id");

    // Validate API key from header (simple shared secret for cross-app auth)
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("SCAN_SCHOLAR_API_KEY");
    
    // If API key is set, validate it; otherwise allow authenticated requests
    if (expectedKey && apiKey !== expectedKey) {
      // Fall back to checking bearer token for teacher access
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - API key or auth token required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!teacherId && !classId && !studentId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameter",
          message: "Provide teacher_id, class_id, or student_id" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query based on parameters
    let studentsQuery = supabase
      .from("students")
      .select(`
        id,
        first_name,
        last_name,
        classes!inner (id, name, teacher_id)
      `);

    if (studentId) {
      studentsQuery = studentsQuery.eq("id", studentId);
    } else if (classId) {
      studentsQuery = studentsQuery.eq("class_id", classId);
    } else if (teacherId) {
      studentsQuery = studentsQuery.eq("classes.teacher_id", teacherId);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error("Students query error:", studentsError);
      throw studentsError;
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ students: [], message: "No students found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch analytics for each student
    const analyticsPromises = students.map(async (student: any) => {
      // Get attempts with scores
      const { data: attempts } = await supabase
        .from("attempts")
        .select(`
          id,
          created_at,
          question_id,
          questions (prompt_text, question_topics (topics (name))),
          scores (points_earned, rubrics (points))
        `)
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get misconceptions
      const { data: misconceptions } = await supabase
        .from("attempt_misconceptions")
        .select(`
          misconception_tags (name, description),
          attempts!inner (student_id)
        `)
        .eq("attempts.student_id", student.id);

      // Calculate overall score
      let totalEarned = 0;
      let totalPossible = 0;
      const topicScores: Record<string, { earned: number; possible: number; count: number }> = {};
      
      const recentAttempts: StudentAnalytics["recent_attempts"] = [];

      (attempts || []).forEach((attempt: any) => {
        let attemptEarned = 0;
        let attemptPossible = 0;
        
        (attempt.scores || []).forEach((score: any) => {
          const earned = score.points_earned || 0;
          const possible = score.rubrics?.points || 0;
          attemptEarned += earned;
          attemptPossible += possible;
          totalEarned += earned;
          totalPossible += possible;
        });

        // Track by topic
        const topics = attempt.questions?.question_topics || [];
        topics.forEach((qt: any) => {
          const topicName = qt.topics?.name;
          if (topicName) {
            if (!topicScores[topicName]) {
              topicScores[topicName] = { earned: 0, possible: 0, count: 0 };
            }
            topicScores[topicName].earned += attemptEarned;
            topicScores[topicName].possible += attemptPossible;
            topicScores[topicName].count += 1;
          }
        });

        if (recentAttempts.length < 10) {
          recentAttempts.push({
            question_id: attempt.question_id,
            question_text: attempt.questions?.prompt_text || null,
            score_earned: attemptEarned,
            score_possible: attemptPossible,
            date: attempt.created_at,
          });
        }
      });

      // Calculate topic performance
      const topicPerformance = Object.entries(topicScores).map(([topic, data]) => ({
        topic,
        score_percentage: data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
        attempts: data.count,
      }));

      // Aggregate misconceptions
      const misconceptionCounts: Record<string, { name: string; description: string | null; count: number }> = {};
      (misconceptions || []).forEach((m: any) => {
        const name = m.misconception_tags?.name;
        if (name) {
          if (!misconceptionCounts[name]) {
            misconceptionCounts[name] = {
              name,
              description: m.misconception_tags?.description || null,
              count: 0,
            };
          }
          misconceptionCounts[name].count += 1;
        }
      });

      const studentMisconceptions = Object.values(misconceptionCounts)
        .map((m) => ({ name: m.name, description: m.description, frequency: m.count }))
        .sort((a, b) => b.frequency - a.frequency);

      const analytics: StudentAnalytics = {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        class_name: student.classes?.name || "Unknown",
        overall_score: totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0,
        total_attempts: attempts?.length || 0,
        topic_performance: topicPerformance,
        misconceptions: studentMisconceptions,
        recent_attempts: recentAttempts,
      };

      return analytics;
    });

    const studentsAnalytics = await Promise.all(analyticsPromises);

    // Calculate class-level summary if fetching multiple students
    const classSummary = studentsAnalytics.length > 1 ? {
      total_students: studentsAnalytics.length,
      class_average: Math.round(
        studentsAnalytics.reduce((sum, s) => sum + s.overall_score, 0) / studentsAnalytics.length
      ),
      common_misconceptions: getCommonMisconceptions(studentsAnalytics),
      struggling_topics: getStrugglingTopics(studentsAnalytics),
    } : null;

    return new Response(
      JSON.stringify({
        students: studentsAnalytics,
        summary: classSummary,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching analytics:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to fetch analytics", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getCommonMisconceptions(students: StudentAnalytics[]) {
  const counts: Record<string, { name: string; description: string | null; count: number }> = {};
  students.forEach((s) => {
    s.misconceptions.forEach((m) => {
      if (!counts[m.name]) {
        counts[m.name] = { name: m.name, description: m.description, count: 0 };
      }
      counts[m.name].count += m.frequency;
    });
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
}

function getStrugglingTopics(students: StudentAnalytics[]) {
  const topicAverages: Record<string, { total: number; count: number }> = {};
  students.forEach((s) => {
    s.topic_performance.forEach((t) => {
      if (!topicAverages[t.topic]) {
        topicAverages[t.topic] = { total: 0, count: 0 };
      }
      topicAverages[t.topic].total += t.score_percentage;
      topicAverages[t.topic].count += 1;
    });
  });
  return Object.entries(topicAverages)
    .map(([topic, data]) => ({
      topic,
      average_score: Math.round(data.total / data.count),
    }))
    .filter((t) => t.average_score < 70)
    .sort((a, b) => a.average_score - b.average_score)
    .slice(0, 5);
}
