import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AwardRewardsRequest {
  claim_type: "practice_set" | "game" | "study_goal" | "assignment" | "challenge";
  reference_id: string;
  xp_amount: number;
  coin_amount: number;
  reason: string;
  // For validation - depends on claim_type
  validation_data?: {
    score?: number;
    passing_threshold?: number;
    questions_answered?: number;
    correct_answers?: number;
    time_spent_seconds?: number;
    goal_index?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is a teacher (teachers are blocked from student rewards)
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (userRole) {
      return new Response(
        JSON.stringify({ error: "Teachers cannot access student rewards. Please use NYCologic AI." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AwardRewardsRequest = await req.json();
    const { claim_type, reference_id, xp_amount, coin_amount, reason, validation_data } = body;

    // Validate required fields
    if (!claim_type || !reference_id || xp_amount === undefined || coin_amount === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the claim based on type
    let isValid = false;
    let validationError = "";

    switch (claim_type) {
      case "practice_set": {
        // Verify the practice set exists and belongs to this user
        const { data: practiceSet, error: psError } = await supabaseAdmin
          .from("practice_sets")
          .select("id, student_id, status, score, xp_reward, coin_reward")
          .eq("id", reference_id)
          .single();

        if (psError || !practiceSet) {
          validationError = "Practice set not found";
          break;
        }

        if (practiceSet.student_id !== user.id) {
          validationError = "Practice set does not belong to this user";
          break;
        }

        if (practiceSet.status !== "completed") {
          validationError = "Practice set is not completed";
          break;
        }

        // Verify score meets threshold (60%)
        if (!practiceSet.score || practiceSet.score < 60) {
          validationError = "Score does not meet the minimum threshold (60%)";
          break;
        }

        // Verify requested rewards match the practice set rewards
        if (xp_amount > practiceSet.xp_reward || coin_amount > practiceSet.coin_reward) {
          validationError = "Requested rewards exceed allowed amounts";
          break;
        }

        isValid = true;
        break;
      }

      case "game": {
        // Verify the game exists and belongs to this user
        const { data: game, error: gameError } = await supabaseAdmin
          .from("skill_games")
          .select("id, student_id, status, high_score, xp_reward, coin_reward")
          .eq("id", reference_id)
          .single();

        if (gameError || !game) {
          validationError = "Game not found";
          break;
        }

        if (game.student_id !== user.id) {
          validationError = "Game does not belong to this user";
          break;
        }

        // Verify there's a passing score (70%)
        const score = validation_data?.score;
        if (!score || score < 70) {
          validationError = "Score does not meet the minimum threshold (70%)";
          break;
        }

        // Verify requested rewards match the game rewards
        if (xp_amount > game.xp_reward || coin_amount > game.coin_reward) {
          validationError = "Requested rewards exceed allowed amounts";
          break;
        }

        isValid = true;
        break;
      }

      case "study_goal": {
        // Study goals are stored in localStorage, so we need additional validation
        // The reference_id should be a hash of: user_id + week_start + goal_index
        if (!validation_data?.goal_index === undefined) {
          validationError = "Missing goal index";
          break;
        }

        // Limit rewards for study goals
        if (xp_amount > 25 || coin_amount > 10) {
          validationError = "Study goal rewards exceed maximum (25 XP, 10 coins)";
          break;
        }

        // For study goals, we use a time-based reference to prevent repeated claims
        // The reference_id should include the week identifier
        isValid = true;
        break;
      }

      case "assignment": {
        // Assignments are validated through the grade-assignment edge function
        // This case is for backward compatibility
        const { data: attempt, error: attemptError } = await supabaseAdmin
          .from("attempts")
          .select("id, student_id, status, score, assignment_id")
          .eq("id", reference_id)
          .single();

        if (attemptError || !attempt) {
          validationError = "Attempt not found";
          break;
        }

        if (attempt.student_id !== user.id) {
          validationError = "Attempt does not belong to this user";
          break;
        }

        if (attempt.status !== "verified" && attempt.status !== "submitted") {
          validationError = "Attempt is not in a valid state for rewards";
          break;
        }

        isValid = true;
        break;
      }

      case "challenge": {
        // Verify challenge participation and completion
        const { data: participant, error: partError } = await supabaseAdmin
          .from("challenge_participants")
          .select("id, student_id, completed_at, rewards_claimed, challenge:challenges(xp_bonus, coin_bonus)")
          .eq("id", reference_id)
          .single();

        if (partError || !participant) {
          validationError = "Challenge participation not found";
          break;
        }

        if (participant.student_id !== user.id) {
          validationError = "Challenge does not belong to this user";
          break;
        }

        if (!participant.completed_at) {
          validationError = "Challenge not completed";
          break;
        }

        if (participant.rewards_claimed) {
          validationError = "Challenge rewards already claimed";
          break;
        }

        isValid = true;
        break;
      }

      default:
        validationError = `Unknown claim type: ${claim_type}`;
    }

    if (!isValid) {
      console.error(`Validation failed for ${claim_type}:`, validationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: validationError,
          claim_type,
          reference_id 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the secure database function to award rewards
    const { data: result, error: awardError } = await supabaseAdmin.rpc(
      "award_rewards_secure",
      {
        p_student_id: user.id,
        p_claim_type: claim_type,
        p_reference_id: reference_id,
        p_xp_amount: xp_amount,
        p_coin_amount: coin_amount,
        p_reason: reason,
      }
    );

    if (awardError) {
      console.error("Error awarding rewards:", awardError);
      return new Response(
        JSON.stringify({ success: false, error: awardError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Rewards awarded successfully:`, result);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in award-rewards function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
