import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface WebhookPayload {
  action: string;
  data: Record<string, unknown>;
}

interface PracticeQuestion {
  prompt: string;
  question_type: string;
  options?: string[];
  answer_key: unknown;
  hint?: string;
  difficulty?: number;
  skill_tag?: string;
}

interface PracticeSetData {
  student_id: string;
  external_ref?: string;
  title: string;
  description?: string;
  skill_tags?: string[];
  questions: PracticeQuestion[];
  xp_reward?: number;
  coin_reward?: number;
}

interface SkillGameData {
  student_id: string;
  external_ref?: string;
  title: string;
  game_type: string;
  skill_tag: string;
  difficulty?: number;
  game_data: Record<string, unknown>;
  xp_reward?: number;
  coin_reward?: number;
}

interface ContentAssignmentData {
  student_id: string;
  content_type: "practice_set" | "skill_game" | "assignment";
  content_id: string;
  notify_student?: boolean;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("GEOBLOX_API_KEY");
    
    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    const { action, data } = payload;

    console.log(`GeoBlox webhook received action: ${action}`);

    switch (action) {
      case "create_practice_set": {
        const setData = data as unknown as PracticeSetData;
        
        // Create practice set
        const { data: practiceSet, error: setError } = await supabase
          .from("practice_sets")
          .insert({
            student_id: setData.student_id,
            external_ref: setData.external_ref,
            title: setData.title,
            description: setData.description,
            skill_tags: setData.skill_tags,
            source: "geoblox",
            status: "pending",
            total_questions: setData.questions?.length || 0,
            xp_reward: setData.xp_reward || 25,
            coin_reward: setData.coin_reward || 10,
          })
          .select()
          .single();

        if (setError) {
          console.error("Error creating practice set:", setError);
          return new Response(
            JSON.stringify({ error: "Failed to create practice set", details: setError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create questions for the practice set
        if (setData.questions && setData.questions.length > 0) {
          const questionsToInsert = setData.questions.map((q, index) => ({
            practice_set_id: practiceSet.id,
            prompt: q.prompt,
            question_type: q.question_type || "multiple_choice",
            options: q.options ? JSON.stringify(q.options) : null,
            answer_key: q.answer_key,
            hint: q.hint,
            difficulty: q.difficulty || 1,
            skill_tag: q.skill_tag,
            order_index: index,
          }));

          const { error: questionsError } = await supabase
            .from("practice_questions")
            .insert(questionsToInsert);

          if (questionsError) {
            console.error("Error creating questions:", questionsError);
          }
        }

        // Notify student
        await supabase.from("notifications").insert({
          user_id: setData.student_id,
          type: "new_practice",
          title: "📚 New Practice Set!",
          message: `GeoBlox created a personalized practice set for you: "${setData.title}"`,
          icon: "📚",
          data: { practice_set_id: practiceSet.id, source: "geoblox" },
        });

        return new Response(
          JSON.stringify({ success: true, practice_set_id: practiceSet.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_skill_game": {
        const gameData = data as unknown as SkillGameData;

        const { data: skillGame, error: gameError } = await supabase
          .from("skill_games")
          .insert({
            student_id: gameData.student_id,
            external_ref: gameData.external_ref,
            title: gameData.title,
            game_type: gameData.game_type,
            skill_tag: gameData.skill_tag,
            difficulty: gameData.difficulty || 1,
            game_data: gameData.game_data,
            source: "geoblox",
            status: "available",
            xp_reward: gameData.xp_reward || 30,
            coin_reward: gameData.coin_reward || 15,
          })
          .select()
          .single();

        if (gameError) {
          console.error("Error creating skill game:", gameError);
          return new Response(
            JSON.stringify({ error: "Failed to create skill game", details: gameError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Notify student
        await supabase.from("notifications").insert({
          user_id: gameData.student_id,
          type: "new_game",
          title: "🎮 New Skill Game!",
          message: `GeoBlox created a game for you: "${gameData.title}"`,
          icon: "🎮",
          data: { game_id: skillGame.id, source: "geoblox" },
        });

        return new Response(
          JSON.stringify({ success: true, game_id: skillGame.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_student_weaknesses": {
        const { student_id, weak_topics, misconceptions, remediation_recommendations } = data as {
          student_id: string;
          weak_topics?: string[];
          misconceptions?: Record<string, string>[];
          remediation_recommendations?: string[];
        };

        // Update external_students if exists
        const { error: externalError } = await supabase
          .from("external_students")
          .update({
            weak_topics: weak_topics,
            misconceptions: misconceptions,
            remediation_recommendations: remediation_recommendations,
            updated_at: new Date().toISOString(),
          })
          .eq("linked_user_id", student_id);

        if (externalError) {
          console.error("Error updating external student:", externalError);
        }

        // Update student_profiles weaknesses
        if (weak_topics && weak_topics.length > 0) {
          await supabase
            .from("student_profiles")
            .update({
              weaknesses: weak_topics,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", student_id);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "notify_student": {
        const notifyData = data as unknown as ContentAssignmentData;

        await supabase.from("notifications").insert({
          user_id: notifyData.student_id,
          type: "geoblox_message",
          title: "📬 Message from GeoBlox",
          message: notifyData.message || "You have new personalized content available!",
          icon: "📬",
          data: { 
            content_type: notifyData.content_type,
            content_id: notifyData.content_id,
            source: "geoblox" 
          },
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync_mastery_update": {
        const { student_id, standard_code, mastery_level, attempts_count, correct_count } = data as {
          student_id: string;
          standard_code: string;
          mastery_level: string;
          attempts_count: number;
          correct_count: number;
        };

        // Find standard by code
        const { data: standard } = await supabase
          .from("nys_standards")
          .select("id")
          .eq("code", standard_code)
          .single();

        if (standard) {
          await supabase
            .from("student_standard_mastery")
            .upsert({
              student_id,
              standard_id: standard.id,
              mastery_level,
              attempts_count,
              correct_count,
              last_attempt_at: new Date().toISOString(),
              mastered_at: mastery_level === "mastered" ? new Date().toISOString() : null,
            }, { onConflict: "student_id,standard_id" });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action", action }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
