import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Question {
  id: string;
  prompt: string;
  question_type: "multiple_choice" | "short_answer" | "drag_order" | "matching" | "fill_blank";
  options?: string[];
  answer_key: string | string[] | { left: string; right: string }[];
  fill_blank_sentence?: string;
  skill_tag?: string;
  examType?: string;
}

interface SubmittedAnswer {
  question_id: string;
  answer: string;
}

interface GradeRequest {
  student_id: string;
  assignment_id: string;
  attempt_id?: string;
  answers: SubmittedAnswer[];
  questions: Question[];
  exam_type?: string;
}

interface GradeResult {
  score: number;
  total_questions: number;
  percentage: number;
  meets_threshold: boolean;
  feedback: string;
  incorrect_topics: string[];
  xp_earned: number;
  coins_earned: number;
  question_results: {
    question_id: string;
    is_correct: boolean;
    correct_answer: string;
    student_answer: string;
  }[];
  geoblox_unlocked?: boolean;
}

// Grade drag_order questions - check if arrays match
function gradeDragOrder(studentAnswer: string, correctOrder: string[]): boolean {
  try {
    const parsedAnswer = JSON.parse(studentAnswer);
    if (!Array.isArray(parsedAnswer)) return false;
    if (parsedAnswer.length !== correctOrder.length) return false;
    return parsedAnswer.every((item, idx) => item === correctOrder[idx]);
  } catch {
    return false;
  }
}

// Grade matching questions - check if all pairs match correctly
function gradeMatching(studentAnswer: string, correctPairs: { left: string; right: string }[]): boolean {
  try {
    const parsedAnswer = JSON.parse(studentAnswer);
    if (typeof parsedAnswer !== "object") return false;
    
    // Check each correct pair
    for (const pair of correctPairs) {
      if (parsedAnswer[pair.left] !== pair.right) {
        return false;
      }
    }
    return Object.keys(parsedAnswer).length === correctPairs.length;
  } catch {
    return false;
  }
}

// Grade fill_blank questions - check if all blanks are correct
function gradeFillBlank(studentAnswer: string, correctAnswers: string[]): boolean {
  try {
    const parsedAnswer = JSON.parse(studentAnswer);
    if (!Array.isArray(parsedAnswer)) return false;
    if (parsedAnswer.length !== correctAnswers.length) return false;
    
    return parsedAnswer.every((answer, idx) => {
      const normalizedStudent = answer.toString().toLowerCase().trim();
      const normalizedCorrect = correctAnswers[idx].toString().toLowerCase().trim();
      return normalizedStudent === normalizedCorrect;
    });
  } catch {
    return false;
  }
}

// Use AI to grade short answer questions
async function gradeShortAnswer(
  studentAnswer: string,
  correctAnswer: string | string[],
  prompt: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback to simple string matching if no AI key
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const isCorrect = correctAnswers.some(ans => 
      normalizedStudent === ans.toLowerCase().trim() ||
      normalizedStudent.includes(ans.toLowerCase().trim())
    );
    return { isCorrect, feedback: isCorrect ? "Correct!" : "Not quite right." };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a friendly teacher grading student work. Be encouraging but accurate.
            
Given a question, the correct answer(s), and a student's answer, determine if the student's answer is correct.
Consider spelling variations, equivalent answers, and partial credit for short answers.

Respond with JSON only: {"isCorrect": boolean, "feedback": "brief encouraging feedback"}`
          },
          {
            role: "user",
            content: `Question: ${prompt}
Correct Answer(s): ${JSON.stringify(correctAnswer)}
Student's Answer: ${studentAnswer}

Is this correct?`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI grading failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        isCorrect: result.isCorrect === true,
        feedback: result.feedback || (result.isCorrect ? "Correct!" : "Not quite right.")
      };
    }
    
    // Fallback
    return { isCorrect: false, feedback: "Unable to grade this answer." };
  } catch (error) {
    console.error("AI grading error:", error);
    // Fallback to simple matching
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const isCorrect = correctAnswers.some(ans => 
      normalizedStudent === ans.toLowerCase().trim()
    );
    return { isCorrect, feedback: isCorrect ? "Correct!" : "Not quite right." };
  }
}

// Update geometry mastery and check for GeoBlox unlock
async function updateGeometryMastery(
  supabaseClient: any,
  studentId: string,
  questionsAttempted: number,
  questionsCorrect: number
): Promise<boolean> {
  try {
    // Get existing mastery record
    const { data: existing } = await supabaseClient
      .from("geometry_mastery")
      .select("*")
      .eq("student_id", studentId)
      .single();

    const existingData = existing as { 
      questions_attempted?: number; 
      questions_correct?: number;
      geoblox_unlocked?: boolean;
      unlocked_at?: string | null;
    } | null;

    const totalAttempted = (existingData?.questions_attempted || 0) + questionsAttempted;
    const totalCorrect = (existingData?.questions_correct || 0) + questionsCorrect;
    const percentage = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;
    const shouldUnlock = percentage >= 70;

    if (existingData) {
      // Update existing record
      await supabaseClient
        .from("geometry_mastery")
        .update({
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          mastery_percentage: percentage,
          geoblox_unlocked: shouldUnlock,
          unlocked_at: shouldUnlock && !existingData.geoblox_unlocked ? new Date().toISOString() : existingData.unlocked_at,
        })
        .eq("student_id", studentId);
    } else {
      // Insert new record
      await supabaseClient
        .from("geometry_mastery")
        .insert({
          student_id: studentId,
          questions_attempted: totalAttempted,
          questions_correct: totalCorrect,
          mastery_percentage: percentage,
          geoblox_unlocked: shouldUnlock,
          unlocked_at: shouldUnlock ? new Date().toISOString() : null,
        });
    }

    console.log(`Geometry mastery for ${studentId}: ${percentage.toFixed(1)}% (${shouldUnlock ? "UNLOCKED" : "locked"})`);
    return shouldUnlock;
  } catch (error) {
    console.error("Error updating geometry mastery:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nycologicApiUrl = Deno.env.get("NYCOLOGIC_API_URL");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const gradeRequest: GradeRequest = await req.json();

    console.log(`Grading assignment ${gradeRequest.assignment_id} for student ${gradeRequest.student_id}`);

    const { student_id, assignment_id, attempt_id, answers, questions, exam_type } = gradeRequest;
    
    // Grade each question
    const questionResults: GradeResult["question_results"] = [];
    const incorrectTopics: string[] = [];
    let correctCount = 0;

    for (const question of questions) {
      const submittedAnswer = answers.find(a => a.question_id === question.id);
      const studentAnswer = submittedAnswer?.answer || "";
      
      let isCorrect = false;
      let correctAnswerStr = "";

      switch (question.question_type) {
        case "multiple_choice":
          // Simple exact match for multiple choice
          const mcCorrect = Array.isArray(question.answer_key) 
            ? question.answer_key[0] 
            : question.answer_key;
          correctAnswerStr = String(mcCorrect);
          isCorrect = studentAnswer === correctAnswerStr;
          break;

        case "short_answer":
          // Use AI for short answer grading
          const gradeResult = await gradeShortAnswer(
            studentAnswer,
            question.answer_key as string | string[],
            question.prompt
          );
          isCorrect = gradeResult.isCorrect;
          const saAnswerKey = question.answer_key;
          if (Array.isArray(saAnswerKey) && typeof saAnswerKey[0] === 'string') {
            correctAnswerStr = saAnswerKey[0];
          } else if (typeof saAnswerKey === 'string') {
            correctAnswerStr = saAnswerKey;
          } else {
            correctAnswerStr = JSON.stringify(saAnswerKey);
          }
          break;

        case "drag_order":
          // Check if order matches
          const orderCorrect = question.answer_key as string[];
          isCorrect = gradeDragOrder(studentAnswer, orderCorrect);
          correctAnswerStr = JSON.stringify(orderCorrect);
          break;

        case "matching":
          // Check if all pairs are matched correctly
          const pairs = question.answer_key as { left: string; right: string }[];
          isCorrect = gradeMatching(studentAnswer, pairs);
          correctAnswerStr = JSON.stringify(pairs);
          break;

        case "fill_blank":
          // Check if all blanks are filled correctly
          const blankAnswers = question.answer_key as string[];
          isCorrect = gradeFillBlank(studentAnswer, blankAnswers);
          correctAnswerStr = JSON.stringify(blankAnswers);
          break;

        default:
          console.warn(`Unknown question type: ${question.question_type}`);
          isCorrect = false;
          correctAnswerStr = "Unknown";
      }

      if (isCorrect) {
        correctCount++;
      } else if (question.skill_tag && !incorrectTopics.includes(question.skill_tag)) {
        incorrectTopics.push(question.skill_tag);
      }

      questionResults.push({
        question_id: question.id,
        is_correct: isCorrect,
        correct_answer: correctAnswerStr,
        student_answer: studentAnswer,
      });
    }

    const totalQuestions = questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const threshold = 70;
    const meetsThreshold = percentage >= threshold;

    // Calculate rewards (only if passing)
    const baseXp = 10;
    const baseCoin = 2;
    const xpEarned = meetsThreshold ? baseXp * correctCount : 0;
    const coinsEarned = meetsThreshold ? baseCoin * correctCount : 0;

    // Generate feedback
    let feedback = "";
    if (percentage === 100) {
      feedback = "Perfect score! You're a superstar! 🌟";
    } else if (percentage >= 90) {
      feedback = "Amazing work! You really know your stuff!";
    } else if (percentage >= 80) {
      feedback = "Great job! Keep up the excellent work!";
    } else if (meetsThreshold) {
      feedback = "Good effort! You passed!";
    } else if (percentage >= 50) {
      feedback = "You're getting there! A little more practice and you'll nail it!";
    } else {
      feedback = "Keep trying! Practice makes perfect!";
    }

    // Track if this is a geometry exam for GeoBlox unlock
    let geobloxUnlocked = false;
    const isGeometryExam = exam_type === "geometry" || questions.some(q => q.examType === "geometry");
    
    if (isGeometryExam) {
      geobloxUnlocked = await updateGeometryMastery(supabase, student_id, totalQuestions, correctCount);
    }

    const gradeResult: GradeResult = {
      score: correctCount,
      total_questions: totalQuestions,
      percentage,
      meets_threshold: meetsThreshold,
      feedback,
      incorrect_topics: incorrectTopics,
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      question_results: questionResults,
      geoblox_unlocked: geobloxUnlocked,
    };

    // Update attempt in database if attempt_id provided
    if (attempt_id) {
      await supabase
        .from("attempts")
        .update({
          score: correctCount,
          status: "verified",
          answers: answers,
          verified_at: new Date().toISOString(),
        })
        .eq("id", attempt_id);
    }

    // Award XP and coins SECURELY using the database function (prevents manipulation)
    if (meetsThreshold && xpEarned > 0) {
      console.log(`Awarding rewards via secure function: ${xpEarned} XP, ${coinsEarned} coins`);
      
      const { data: rewardResult, error: rewardError } = await supabase.rpc("award_rewards_secure", {
        p_student_id: student_id,
        p_claim_type: "assignment",
        p_reference_id: assignment_id,
        p_xp_amount: xpEarned,
        p_coin_amount: coinsEarned,
        p_reason: `Assignment completed: ${percentage}%`,
      });

      if (rewardError) {
        console.error("Secure reward error:", rewardError);
        // Check if it's a duplicate claim (which is expected for retries)
        if (!rewardError.message?.includes("already claimed")) {
          console.warn("Failed to award rewards securely:", rewardError.message);
        }
      } else {
        console.log("Rewards awarded securely:", rewardResult);
      }
    }

    // Sync to NYCologic if configured
    if (nycologicApiUrl) {
      try {
        await fetch(nycologicApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-source-app": "scholar-app",
          },
          body: JSON.stringify({
            source: "scholar-app",
            timestamp: new Date().toISOString(),
            event_type: "assignment_graded",
            data: {
              student_id,
              assignment_id,
              score: correctCount,
              total_questions: totalQuestions,
              percentage,
              passed: meetsThreshold,
              xp_earned: xpEarned,
              coins_earned: coinsEarned,
              incorrect_topics: incorrectTopics,
              question_results: questionResults,
              geoblox_unlocked: geobloxUnlocked,
            },
          }),
        });
        console.log("Synced to NYCologic successfully");
      } catch (syncError) {
        console.error("NYCologic sync failed:", syncError);
        // Continue anyway - don't fail the grading
      }
    }

    console.log(`Grading complete: ${correctCount}/${totalQuestions} (${percentage}%)`);

    return new Response(
      JSON.stringify(gradeResult),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Grading error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Grading failed", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
