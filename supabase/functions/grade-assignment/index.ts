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

interface QuestionAnalysis {
  question_id: string;
  is_correct: boolean;
  correct_answer: string;
  student_answer: string;
  explanation: string;
  what_went_right: string;
  what_went_wrong: string;
  tip: string;
}

interface GradeResult {
  score: number;
  total_questions: number;
  percentage: number;
  meets_threshold: boolean;
  feedback: string;
  detailed_feedback: string;
  strengths: string[];
  areas_to_improve: string[];
  incorrect_topics: string[];
  xp_earned: number;
  coins_earned: number;
  question_results: QuestionAnalysis[];
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

// Use AI to grade short answer questions with detailed analysis
async function gradeShortAnswer(
  studentAnswer: string,
  correctAnswer: string | string[],
  prompt: string
): Promise<{ isCorrect: boolean; feedback: string; explanation: string; what_went_right: string; what_went_wrong: string; tip: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const defaultRight = "Student attempted the question.";
  const defaultWrong = "";
  const defaultTip = "";
  
  if (!LOVABLE_API_KEY) {
    // Fallback to simple string matching if no AI key
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const isCorrect = correctAnswers.some(ans => 
      normalizedStudent === ans.toLowerCase().trim() ||
      normalizedStudent.includes(ans.toLowerCase().trim())
    );
    return { 
      isCorrect, 
      feedback: isCorrect ? "Correct!" : "Not quite right.", 
      explanation: isCorrect 
        ? `Your answer "${studentAnswer}" matches the expected answer.` 
        : `The correct answer is "${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer}". You answered "${studentAnswer}".`,
      what_went_right: isCorrect ? "You provided the correct answer!" : defaultRight,
      what_went_wrong: isCorrect ? "" : `Your answer "${studentAnswer}" doesn't match the expected answer "${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer}".`,
      tip: isCorrect ? "" : "Review the topic and try again. Focus on understanding the key concepts behind the question."
    };
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
            content: `You are a friendly, encouraging teacher grading student work. Your goal is to help the student learn from their answer.

Given a question, the correct answer(s), and a student's answer, provide a detailed analysis.

Consider spelling variations, equivalent answers, and partial credit for short answers.

Respond with JSON only:
{
  "isCorrect": boolean,
  "feedback": "brief encouraging feedback (1-2 sentences)",
  "explanation": "detailed explanation of WHY the answer is right or wrong (2-3 sentences). If wrong, explain what the correct answer means and why it's correct.",
  "what_went_right": "specific things the student did well (even if answer is wrong, credit partial understanding, relevant vocabulary used, etc.)",
  "what_went_wrong": "specific mistakes or misunderstandings shown in the answer. If correct, leave empty string.",
  "tip": "one concrete, actionable study tip to help the student improve on this topic. If correct, suggest how to deepen understanding."
}`
          },
          {
            role: "user",
            content: `Question: ${prompt}
Correct Answer(s): ${JSON.stringify(correctAnswer)}
Student's Answer: ${studentAnswer}

Provide detailed analysis:`
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
        feedback: result.feedback || (result.isCorrect ? "Correct!" : "Not quite right."),
        explanation: result.explanation || "",
        what_went_right: result.what_went_right || defaultRight,
        what_went_wrong: result.what_went_wrong || defaultWrong,
        tip: result.tip || defaultTip
      };
    }
    
    // Fallback
    return { isCorrect: false, feedback: "Unable to grade this answer.", explanation: "", what_went_right: defaultRight, what_went_wrong: "", tip: "" };
  } catch (error) {
    console.error("AI grading error:", error);
    // Fallback to simple matching
    const normalizedStudent = studentAnswer.toLowerCase().trim();
    const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    const isCorrect = correctAnswers.some(ans => 
      normalizedStudent === ans.toLowerCase().trim()
    );
    return { 
      isCorrect, 
      feedback: isCorrect ? "Correct!" : "Not quite right.",
      explanation: isCorrect 
        ? `Your answer "${studentAnswer}" is correct!` 
        : `The correct answer is "${Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer}".`,
      what_went_right: isCorrect ? "You provided the correct answer!" : defaultRight,
      what_went_wrong: isCorrect ? "" : `Your answer doesn't match the expected answer.`,
      tip: isCorrect ? "" : "Review this topic and try again."
    };
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
    
    // Grade each question with detailed analysis
    const questionResults: QuestionAnalysis[] = [];
    const incorrectTopics: string[] = [];
    const strengths: string[] = [];
    const areasToImprove: string[] = [];
    let correctCount = 0;

    for (const question of questions) {
      const submittedAnswer = answers.find(a => a.question_id === question.id);
      const studentAnswer = submittedAnswer?.answer || "";
      
      let isCorrect = false;
      let correctAnswerStr = "";
      let explanation = "";
      let whatWentRight = "";
      let whatWentWrong = "";
      let tip = "";

      switch (question.question_type) {
        case "multiple_choice": {
          // Simple exact match for multiple choice
          const mcCorrect = Array.isArray(question.answer_key) 
            ? question.answer_key[0] 
            : question.answer_key;
          correctAnswerStr = String(mcCorrect);
          isCorrect = studentAnswer === correctAnswerStr;
          
          if (isCorrect) {
            explanation = `Correct! You selected "${studentAnswer}" which is the right answer.`;
            whatWentRight = `You correctly identified the answer to: "${question.prompt.substring(0, 80)}${question.prompt.length > 80 ? '...' : ''}"`;
          } else if (!studentAnswer) {
            explanation = `No answer was selected. The correct answer is "${correctAnswerStr}".`;
            whatWentWrong = `This question was left blank. Make sure to attempt every question.`;
            tip = "Even if you're unsure, try to eliminate wrong choices and make your best guess.";
          } else {
            explanation = `You selected "${studentAnswer}" but the correct answer is "${correctAnswerStr}".`;
            whatWentWrong = `The answer "${studentAnswer}" is incorrect for this question.`;
            tip = question.skill_tag 
              ? `Review the concept of "${question.skill_tag}" to strengthen your understanding.`
              : "Review this topic and think about why the correct answer works better.";
          }
          break;
        }

        case "short_answer": {
          // Use AI for short answer grading with detailed analysis
          const gradeResult = await gradeShortAnswer(
            studentAnswer,
            question.answer_key as string | string[],
            question.prompt
          );
          isCorrect = gradeResult.isCorrect;
          explanation = gradeResult.explanation;
          whatWentRight = gradeResult.what_went_right;
          whatWentWrong = gradeResult.what_went_wrong;
          tip = gradeResult.tip;
          
          const saAnswerKey = question.answer_key;
          if (Array.isArray(saAnswerKey) && typeof saAnswerKey[0] === 'string') {
            correctAnswerStr = saAnswerKey[0];
          } else if (typeof saAnswerKey === 'string') {
            correctAnswerStr = saAnswerKey;
          } else {
            correctAnswerStr = JSON.stringify(saAnswerKey);
          }
          break;
        }

        case "drag_order": {
          // Check if order matches
          const orderCorrect = question.answer_key as string[];
          isCorrect = gradeDragOrder(studentAnswer, orderCorrect);
          correctAnswerStr = JSON.stringify(orderCorrect);
          
          if (isCorrect) {
            explanation = "You placed all items in the correct order!";
            whatWentRight = "You demonstrated understanding of the correct sequence.";
          } else {
            explanation = `The items are not in the correct order. The correct order is: ${orderCorrect.join(" → ")}`;
            whatWentWrong = "The sequence you provided doesn't match the expected order.";
            tip = "Think about the logical relationship between each step and what must come first.";
          }
          break;
        }

        case "matching": {
          // Check if all pairs are matched correctly
          const pairs = question.answer_key as { left: string; right: string }[];
          isCorrect = gradeMatching(studentAnswer, pairs);
          correctAnswerStr = JSON.stringify(pairs);
          
          if (isCorrect) {
            explanation = "All pairs are matched correctly!";
            whatWentRight = "You correctly identified the relationship between all paired items.";
          } else {
            const correctPairsStr = pairs.map(p => `${p.left} → ${p.right}`).join(", ");
            explanation = `Some matches are incorrect. The correct pairings are: ${correctPairsStr}`;
            whatWentWrong = "One or more of your matches don't align with the correct pairings.";
            tip = "Focus on the defining characteristics of each item to find the right match.";
          }
          break;
        }

        case "fill_blank": {
          // Check if all blanks are filled correctly
          const blankAnswers = question.answer_key as string[];
          isCorrect = gradeFillBlank(studentAnswer, blankAnswers);
          correctAnswerStr = JSON.stringify(blankAnswers);
          
          if (isCorrect) {
            explanation = "All blanks are filled in correctly!";
            whatWentRight = "You correctly completed the sentence with the right terms.";
          } else {
            explanation = `The correct answers for the blanks are: ${blankAnswers.join(", ")}`;
            whatWentWrong = "One or more blanks have incorrect answers.";
            tip = "Review the key vocabulary and concepts for this topic.";
          }
          break;
        }

        default:
          console.warn(`Unknown question type: ${question.question_type}`);
          isCorrect = false;
          correctAnswerStr = "Unknown";
          explanation = "Unable to grade this question type.";
      }

      if (isCorrect) {
        correctCount++;
        if (whatWentRight) {
          strengths.push(whatWentRight);
        }
      } else {
        if (question.skill_tag && !incorrectTopics.includes(question.skill_tag)) {
          incorrectTopics.push(question.skill_tag);
        }
        if (whatWentWrong) {
          areasToImprove.push(whatWentWrong);
        }
      }

      questionResults.push({
        question_id: question.id,
        is_correct: isCorrect,
        correct_answer: correctAnswerStr,
        student_answer: studentAnswer,
        explanation,
        what_went_right: whatWentRight,
        what_went_wrong: whatWentWrong,
        tip,
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

    // Generate detailed feedback
    let feedback = "";
    let detailedFeedback = "";
    
    if (percentage === 100) {
      feedback = "Perfect score! You demonstrated complete mastery of this material!";
      detailedFeedback = `Outstanding work! You got all ${totalQuestions} questions correct, showing a thorough understanding of every concept covered. Keep up this excellent level of preparation!`;
    } else if (percentage >= 90) {
      feedback = "Excellent work! You have a strong understanding of this material.";
      const wrongCount = totalQuestions - correctCount;
      detailedFeedback = `You answered ${correctCount} out of ${totalQuestions} questions correctly. You demonstrated strong knowledge across most areas. ${wrongCount === 1 ? 'There was just 1 question' : `There were ${wrongCount} questions`} to review${incorrectTopics.length > 0 ? ` in: ${incorrectTopics.join(', ')}` : ''}.`;
    } else if (percentage >= 80) {
      feedback = "Great job! You understand most of the concepts well.";
      detailedFeedback = `You answered ${correctCount} out of ${totalQuestions} questions correctly (${percentage}%). You showed good understanding of the core material. To improve further, focus on: ${incorrectTopics.length > 0 ? incorrectTopics.join(', ') : 'reviewing the questions you missed'}.`;
    } else if (meetsThreshold) {
      feedback = "Good effort! You passed, but there's room to grow.";
      detailedFeedback = `You answered ${correctCount} out of ${totalQuestions} questions correctly (${percentage}%). You demonstrated understanding of the basics but there are several areas that need more practice${incorrectTopics.length > 0 ? `: ${incorrectTopics.join(', ')}` : ''}. Review the explanations for each question you missed.`;
    } else if (percentage >= 50) {
      feedback = "You're making progress! Let's keep building your skills.";
      detailedFeedback = `You answered ${correctCount} out of ${totalQuestions} questions correctly (${percentage}%). You showed some understanding but need more practice in several areas${incorrectTopics.length > 0 ? `: ${incorrectTopics.join(', ')}` : ''}. Go through each question explanation below and try to understand why the correct answer is right.`;
    } else {
      feedback = "This is a learning opportunity! Review the material and try again.";
      detailedFeedback = `You answered ${correctCount} out of ${totalQuestions} questions correctly (${percentage}%). Don't be discouraged - this shows which areas need your attention. ${incorrectTopics.length > 0 ? `Focus your study on: ${incorrectTopics.join(', ')}. ` : ''}Review each question's explanation below to build your understanding.`;
    }
    
    // Ensure we always have at least one strength
    if (strengths.length === 0 && correctCount > 0) {
      strengths.push(`You correctly answered ${correctCount} out of ${totalQuestions} questions.`);
    } else if (strengths.length === 0) {
      strengths.push("You attempted the assignment, which is an important first step.");
    }
    
    // Ensure we have areas to improve if needed
    if (areasToImprove.length === 0 && correctCount < totalQuestions) {
      if (incorrectTopics.length > 0) {
        areasToImprove.push(`Review the following topics: ${incorrectTopics.join(', ')}`);
      } else {
        areasToImprove.push("Review the questions you got wrong and study the correct answers.");
      }
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
      detailed_feedback: detailedFeedback,
      strengths,
      areas_to_improve: areasToImprove,
      incorrect_topics: incorrectTopics,
      xp_earned: xpEarned,
      coins_earned: coinsEarned,
      question_results: questionResults,
      geoblox_unlocked: geobloxUnlocked,
    };

    // Update attempt in database if attempt_id provided
    if (attempt_id) {
      try {
        // Update attempt status to "reviewed" (the enum values are: pending, analyzed, reviewed)
        // Only update columns that actually exist in the attempts table
        const { error: updateError } = await supabase
          .from("attempts")
          .update({
            status: "reviewed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attempt_id);
        
        if (updateError) {
          console.error("Error updating attempt status (non-fatal):", updateError);
        } else {
          console.log(`Attempt ${attempt_id} marked as reviewed`);
        }
      } catch (attemptUpdateErr) {
        // Don't let attempt update failure crash the entire grading response
        console.error("Failed to update attempt record (non-fatal):", attemptUpdateErr);
      }
    }

    // Award XP and coins SECURELY using the database function (prevents manipulation)
    if (meetsThreshold && xpEarned > 0) {
      try {
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
          
          // Fallback: try direct update if the RPC function doesn't exist
          if (rewardError.message?.includes("function") || rewardError.code === '42883') {
            console.log("RPC not available, falling back to direct update");
            await supabase
              .from("students")
              .update({
                xp_total: supabase.rpc ? undefined : xpEarned, // can't increment directly
                last_activity_date: new Date().toISOString().split('T')[0],
              })
              .eq("id", student_id);
          }
        } else {
          console.log("Rewards awarded securely:", rewardResult);
        }
      } catch (rewardErr) {
        // Don't let reward failure crash the grading response
        console.error("Reward awarding failed (non-fatal):", rewardErr);
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
