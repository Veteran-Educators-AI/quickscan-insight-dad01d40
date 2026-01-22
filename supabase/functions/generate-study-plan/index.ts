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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch student profile
    const { data: studentProfile } = await supabaseClient
      .from("student_profiles")
      .select("weaknesses, strengths, grade_level, skill_tags")
      .eq("user_id", user.id)
      .single();

    // Fetch mastery data
    const { data: masteryData } = await supabaseClient
      .from("student_standard_mastery")
      .select(`
        standard_id,
        mastery_level,
        attempts_count,
        correct_count,
        last_attempt_at,
        nys_standards (
          code,
          subject,
          domain,
          standard_text,
          grade_band
        )
      `)
      .eq("student_id", user.id);

    // Fetch upcoming assignments
    const { data: enrollments } = await supabaseClient
      .from("enrollments")
      .select("class_id")
      .eq("student_id", user.id);

    let upcomingAssignments: any[] = [];
    if (enrollments && enrollments.length > 0) {
      const classIds = enrollments.map(e => e.class_id);
      const { data: assignments } = await supabaseClient
        .from("assignments")
        .select("id, title, subject, due_at, standard_id, nys_standards(code, subject, domain)")
        .in("class_id", classIds)
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(10);
      
      upcomingAssignments = assignments || [];
    }

    // Fetch practice set performance
    const { data: practiceSets } = await supabaseClient
      .from("practice_sets")
      .select("title, score, skill_tags, completed_at")
      .eq("student_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(20);

    // Fetch game performance
    const { data: gamePerformance } = await supabaseClient
      .from("skill_games")
      .select("skill_tag, high_score, attempts_count")
      .eq("student_id", user.id)
      .gt("attempts_count", 0);

    // Build context for AI
    const performanceContext = {
      weaknesses: studentProfile?.weaknesses || [],
      strengths: studentProfile?.strengths || [],
      gradeLevel: studentProfile?.grade_level,
      masteryData: (masteryData || []).map((m: any) => ({
        code: m.nys_standards?.code,
        subject: m.nys_standards?.subject,
        domain: m.nys_standards?.domain,
        standardText: m.nys_standards?.standard_text,
        masteryLevel: m.mastery_level,
        accuracy: m.attempts_count > 0 ? Math.round((m.correct_count / m.attempts_count) * 100) : 0,
        lastAttempt: m.last_attempt_at,
      })),
      upcomingAssignments: upcomingAssignments.map((a: any) => ({
        title: a.title,
        subject: a.subject,
        dueAt: a.due_at,
        standardCode: a.nys_standards?.code,
        domain: a.nys_standards?.domain,
      })),
      recentPractice: (practiceSets || []).map((p: any) => ({
        title: p.title,
        score: p.score,
        skills: p.skill_tags,
      })),
      gamePerformance: (gamePerformance || []).map((g: any) => ({
        skill: g.skill_tag,
        highScore: g.high_score,
        attempts: g.attempts_count,
      })),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert educational coach creating personalized study plans for high school students preparing for NY Regents exams. 

Analyze the student's performance data and create a focused, actionable study plan. Consider:
1. Standards where mastery is low (developing or not_started)
2. Upcoming assignments and their related standards
3. Identified weaknesses that need attention
4. Time until upcoming exams/assignments

Be encouraging but realistic. Prioritize standards that are both weak AND have upcoming relevance.`;

    const userPrompt = `Create a personalized study plan based on this student data:

${JSON.stringify(performanceContext, null, 2)}

Today's date: ${new Date().toLocaleDateString()}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_study_plan",
              description: "Generate a structured study plan with prioritized focus areas and daily recommendations",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A brief encouraging summary of the student's current standing and what to focus on"
                  },
                  priorityAreas: {
                    type: "array",
                    description: "Top 3-5 standards/areas to focus on, in priority order",
                    items: {
                      type: "object",
                      properties: {
                        standardCode: { type: "string", description: "The standard code (e.g., AI-A.REI.3)" },
                        subject: { type: "string" },
                        topic: { type: "string", description: "Brief topic name" },
                        reason: { type: "string", description: "Why this is a priority" },
                        currentLevel: { type: "string", enum: ["not_started", "developing", "approaching", "mastered"] },
                        urgency: { type: "string", enum: ["high", "medium", "low"] },
                        suggestedTime: { type: "string", description: "Suggested daily study time for this area" }
                      },
                      required: ["standardCode", "subject", "topic", "reason", "currentLevel", "urgency", "suggestedTime"]
                    }
                  },
                  weeklyGoals: {
                    type: "array",
                    description: "3-4 specific, achievable goals for this week",
                    items: {
                      type: "object",
                      properties: {
                        goal: { type: "string" },
                        metric: { type: "string", description: "How to measure success" },
                        relatedStandard: { type: "string", description: "Related standard code if applicable" }
                      },
                      required: ["goal", "metric"]
                    }
                  },
                  dailySchedule: {
                    type: "array",
                    description: "Suggested daily study activities for the next 5 days",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", description: "Day name (Today, Tomorrow, Day 3, etc.)" },
                        focusArea: { type: "string" },
                        activities: {
                          type: "array",
                          items: { type: "string" }
                        },
                        estimatedTime: { type: "string" }
                      },
                      required: ["day", "focusArea", "activities", "estimatedTime"]
                    }
                  },
                  encouragement: {
                    type: "string",
                    description: "A motivational message based on the student's progress"
                  }
                },
                required: ["summary", "priorityAreas", "weeklyGoals", "dailySchedule", "encouragement"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_study_plan" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response structure");
    }

    const studyPlan = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ 
      success: true, 
      studyPlan,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating study plan:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate study plan" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
