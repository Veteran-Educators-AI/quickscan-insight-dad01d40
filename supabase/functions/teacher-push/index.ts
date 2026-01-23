import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AssignmentPayload {
  class_id: string;
  title: string;
  description?: string;
  due_at: string;
  standard_code?: string; // e.g., "6.EE.A.1" - we'll look up the standard_id
  standard_id?: string; // Direct standard UUID if known
  subject?: string;
  xp_reward?: number;
  coin_reward?: number;
  printable_url?: string; // URL to worksheet PDF
  external_ref?: string; // Reference ID from the teacher app
  questions?: QuestionPayload[];
}

// Payload for pushing work directly to individual students (no class required)
interface DirectStudentPayload {
  student_email?: string; // Find student by email
  student_external_id?: string; // Find student by external reference
  student_id?: string; // Direct student UUID if known
  title: string;
  description?: string;
  skill_tags?: string[];
  xp_reward?: number;
  coin_reward?: number;
  printable_url?: string;
  external_ref?: string;
  source?: string; // e.g., "nycologic_ai"
  questions?: QuestionPayload[];
}

interface QuestionPayload {
  prompt: string;
  question_type: "multiple_choice" | "short_answer" | "numeric" | "drag_order" | "matching";
  options?: any;
  answer_key: any;
  difficulty?: number;
  hint?: string;
  skill_tag?: string;
}

interface BulkAssignmentPayload {
  assignments: AssignmentPayload[];
}

// Verify API key against integration_tokens table
async function verifyApiKey(apiKey: string, supabase: any): Promise<{ valid: boolean; tokenData?: any }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data: token, error } = await supabase
    .from("integration_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("is_active", true)
    .single();

  if (error || !token) {
    return { valid: false };
  }

  // Update last_used_at
  await supabase
    .from("integration_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id);

  return { valid: true, tokenData: token };
}

// Look up standard by code
async function findStandardByCode(code: string, supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from("nys_standards")
    .select("id")
    .eq("code", code)
    .single();

  if (error || !data) {
    return null;
  }
  return data.id;
}

// Find student by email or external ID
async function findStudent(
  supabase: any, 
  email?: string, 
  externalId?: string, 
  studentId?: string
): Promise<{ found: boolean; student_id?: string; error?: string }> {
  // Direct ID provided
  if (studentId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .single();
    
    if (data) return { found: true, student_id: data.id };
    return { found: false, error: "Student not found by ID" };
  }

  // Find by email via auth.users
  if (email) {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const user = usersData?.users?.find(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (user) return { found: true, student_id: user.id };
    return { found: false, error: `No student found with email: ${email}` };
  }

  // Find by external reference (check practice_sets or profiles for stored external ID)
  if (externalId) {
    // First try to find a practice_set with this external_ref to get student_id
    const { data: practiceSet } = await supabase
      .from("practice_sets")
      .select("student_id")
      .eq("external_ref", externalId)
      .limit(1)
      .single();
    
    if (practiceSet) return { found: true, student_id: practiceSet.student_id };
    return { found: false, error: `No student found with external ID: ${externalId}` };
  }

  return { found: false, error: "Must provide student_email, student_external_id, or student_id" };
}

// Create practice set for a specific student (no class required)
async function createPracticeSet(
  payload: DirectStudentPayload, 
  studentId: string,
  supabase: any
): Promise<{ success: boolean; practice_set_id?: string; error?: string }> {
  // Insert practice set
  const { data: practiceSet, error: setError } = await supabase
    .from("practice_sets")
    .insert({
      student_id: studentId,
      title: payload.title,
      description: payload.description || null,
      skill_tags: payload.skill_tags || null,
      xp_reward: payload.xp_reward || 50,
      coin_reward: payload.coin_reward || 25,
      printable_url: payload.printable_url || null,
      external_ref: payload.external_ref || null,
      source: payload.source || "external_api",
      status: "pending",
      total_questions: payload.questions?.length || 0,
    })
    .select("id")
    .single();

  if (setError) {
    return { success: false, error: setError.message };
  }

  // Insert questions if provided
  if (payload.questions && payload.questions.length > 0) {
    const questionsToInsert = payload.questions.map((q, index) => ({
      practice_set_id: practiceSet.id,
      prompt: q.prompt,
      question_type: q.question_type || "short_answer",
      options: q.options || null,
      answer_key: q.answer_key,
      difficulty: q.difficulty || 1,
      hint: q.hint || null,
      skill_tag: q.skill_tag || null,
      order_index: index,
    }));

    const { error: questionsError } = await supabase
      .from("practice_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error inserting practice questions:", questionsError);
    }
  }

  // Create notification for the student
  await supabase.from("notifications").insert({
    user_id: studentId,
    type: "new_practice",
    title: "📝 New Practice Assigned!",
    message: `You have new practice work: "${payload.title}"`,
    icon: "📝",
    data: { practice_set_id: practiceSet.id, title: payload.title },
  });

  return { success: true, practice_set_id: practiceSet.id };
}

// Create a single assignment
async function createAssignment(payload: AssignmentPayload, supabase: any): Promise<{ success: boolean; assignment_id?: string; error?: string }> {
  // Resolve standard_id from code if provided
  let standardId = payload.standard_id || null;
  if (!standardId && payload.standard_code) {
    standardId = await findStandardByCode(payload.standard_code, supabase);
  }

  // Insert assignment
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      class_id: payload.class_id,
      title: payload.title,
      description: payload.description || null,
      due_at: payload.due_at,
      standard_id: standardId,
      subject: payload.subject || null,
      xp_reward: payload.xp_reward || 50,
      coin_reward: payload.coin_reward || 25,
      printable_url: payload.printable_url || null,
      external_ref: payload.external_ref || null,
      status: "active",
    })
    .select("id")
    .single();

  if (assignmentError) {
    return { success: false, error: assignmentError.message };
  }

  // Insert questions if provided
  if (payload.questions && payload.questions.length > 0) {
    const questionsToInsert = payload.questions.map((q, index) => ({
      assignment_id: assignment.id,
      prompt: q.prompt,
      question_type: q.question_type || "short_answer",
      options: q.options || null,
      answer_key: q.answer_key,
      difficulty: q.difficulty || 1,
      hint: q.hint || null,
      skill_tag: q.skill_tag || null,
      order_index: index,
    }));

    const { error: questionsError } = await supabase
      .from("questions")
      .insert(questionsToInsert);

    if (questionsError) {
      console.error("Error inserting questions:", questionsError);
      // Assignment was created, just log the question error
    }
  }

  return { success: true, assignment_id: assignment.id };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { valid, tokenData } = await verifyApiKey(apiKey, supabase);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const url = new URL(req.url);
    const endpoint = url.pathname.split("/").pop();

    // Route based on endpoint or payload structure
    if (body.assignments && Array.isArray(body.assignments)) {
      // Bulk assignment creation
      const results = [];
      for (const assignment of body.assignments) {
        const result = await createAssignment(assignment, supabase);
        results.push({
          title: assignment.title,
          ...result,
        });
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({
          message: `Created ${successful} assignments, ${failed} failed`,
          results,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (body.class_id && body.title) {
      // Single assignment creation
      const result = await createAssignment(body as AssignmentPayload, supabase);

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Assignment created successfully",
          assignment_id: result.assignment_id,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (body.action === "list_classes") {
      // List classes for the teacher (using token's created_by)
      const { data: classes, error } = await supabase
        .from("classes")
        .select("id, name, class_code, grade_level, grade_band, subject")
        .eq("teacher_id", tokenData.created_by);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ classes }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (body.action === "list_standards") {
      // List available NYS standards
      const query = supabase.from("nys_standards").select("id, code, standard_text, subject, grade_band, domain");
      
      if (body.grade_band) {
        query.eq("grade_band", body.grade_band);
      }
      if (body.subject) {
        query.eq("subject", body.subject);
      }

      const { data: standards, error } = await query.limit(100);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ standards }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (body.action === "get_student_progress") {
      // Get student progress for a class
      const { class_id, student_id } = body;
      
      if (!class_id) {
        return new Response(
          JSON.stringify({ error: "class_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get enrolled students
      let studentsQuery = supabase
        .from("enrollments")
        .select(`
          student_id,
          profiles!inner(id, full_name)
        `)
        .eq("class_id", class_id);

      if (student_id) {
        studentsQuery = studentsQuery.eq("student_id", student_id);
      }

      const { data: enrollments, error: enrollError } = await studentsQuery;

      if (enrollError) {
        return new Response(
          JSON.stringify({ error: enrollError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get progress for each student
      const progressData = [];
      for (const enrollment of enrollments || []) {
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("xp, coins, current_streak")
          .eq("user_id", enrollment.student_id)
          .single();

        const { data: attempts } = await supabase
          .from("attempts")
          .select("assignment_id, status, score")
          .eq("student_id", enrollment.student_id);

        const { data: mastery } = await supabase
          .from("student_standard_mastery")
          .select("standard_id, mastery_level, attempts_count, correct_count")
          .eq("student_id", enrollment.student_id);

        progressData.push({
          student_id: enrollment.student_id,
          name: (enrollment as any).profiles?.full_name,
          xp: studentProfile?.xp || 0,
          coins: studentProfile?.coins || 0,
          streak: studentProfile?.current_streak || 0,
          assignments_completed: attempts?.filter((a) => a.status === "verified").length || 0,
          average_score: attempts?.length 
            ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
            : 0,
          standards_mastered: mastery?.filter((m) => m.mastery_level === "mastered").length || 0,
        });
      }

      return new Response(
        JSON.stringify({ students: progressData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (body.action === "pre_register_students") {
      // Pre-register students for auto-enrollment
      const { class_id, students } = body;
      
      if (!class_id) {
        return new Response(
          JSON.stringify({ error: "class_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        return new Response(
          JSON.stringify({ error: "students array is required with at least one student" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the class belongs to this teacher
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", class_id)
        .eq("teacher_id", tokenData.created_by)
        .single();

      if (classError || !classData) {
        return new Response(
          JSON.stringify({ error: "Class not found or you don't have access" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert pending enrollments
      const results = [];
      for (const student of students) {
        const email = student.email?.toLowerCase();
        if (!email) {
          results.push({ email: null, success: false, error: "Email is required" });
          continue;
        }

        // Check if student already exists by looking up auth users via listUsers filter
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === email
        );

        if (existingAuthUser) {
          // Student already exists, enroll them directly
          const { error: enrollError } = await supabase
            .from("enrollments")
            .insert({ student_id: existingAuthUser.id, class_id })
            .select()
            .single();

          if (enrollError && !enrollError.message.includes("duplicate")) {
            results.push({ email, success: false, error: enrollError.message });
          } else {
            results.push({ email, success: true, status: "enrolled_immediately" });
          }
        } else {
          // Create pending enrollment
          const { error: pendingError } = await supabase
            .from("pending_enrollments")
            .upsert({
              email,
              class_id,
              teacher_id: tokenData.created_by,
              student_name: student.name || null,
            }, { onConflict: "email,class_id" });

          if (pendingError) {
            results.push({ email, success: false, error: pendingError.message });
          } else {
            results.push({ email, success: true, status: "pending_signup" });
          }
        }
      }

      const successful = results.filter((r) => r.success).length;
      const pending = results.filter((r) => r.status === "pending_signup").length;
      const enrolled = results.filter((r) => r.status === "enrolled_immediately").length;

      return new Response(
        JSON.stringify({
          message: `Processed ${successful} students: ${enrolled} enrolled immediately, ${pending} pending signup`,
          class_name: classData.name,
          results,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.action === "list_pending_enrollments") {
      // List pending enrollments for a class
      const { class_id } = body;

      let query = supabase
        .from("pending_enrollments")
        .select("id, email, student_name, class_id, created_at, processed, processed_at, classes(name)")
        .eq("teacher_id", tokenData.created_by);

      if (class_id) {
        query = query.eq("class_id", class_id);
      }

      const { data: pending, error } = await query.order("created_at", { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          pending_enrollments: pending,
          total: pending?.length || 0,
          unprocessed: pending?.filter(p => !p.processed).length || 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.action === "create_class") {
      // Create a new class
      const { name, grade_level, grade_band, subject } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: "Class name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a unique class code
      const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newClass, error: createError } = await supabase
        .from("classes")
        .insert({
          name,
          teacher_id: tokenData.created_by,
          class_code: classCode,
          grade_level: grade_level || null,
          grade_band: grade_band || null,
          subject: subject || null,
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Class created successfully",
          class: newClass,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.action === "push_to_student") {
      // Push work directly to a student (no class required) - uses practice_sets
      const { student_email, student_external_id, student_id, title } = body;

      if (!title) {
        return new Response(
          JSON.stringify({ error: "title is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the student
      const studentResult = await findStudent(supabase, student_email, student_external_id, student_id);
      
      if (!studentResult.found) {
        return new Response(
          JSON.stringify({ error: studentResult.error, hint: "Student must have a ScholarQuest account first" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the practice set
      const result = await createPracticeSet(body as DirectStudentPayload, studentResult.student_id!, supabase);

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Practice work pushed to student successfully",
          practice_set_id: result.practice_set_id,
          student_id: studentResult.student_id,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.action === "bulk_push_to_students") {
      // Push same work to multiple students
      const { students, title, description, skill_tags, xp_reward, coin_reward, printable_url, external_ref, source, questions } = body;

      if (!title) {
        return new Response(
          JSON.stringify({ error: "title is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!students || !Array.isArray(students) || students.length === 0) {
        return new Response(
          JSON.stringify({ error: "students array is required with at least one student identifier" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const studentRef of students) {
        const email = typeof studentRef === "string" ? studentRef : studentRef.email;
        const extId = typeof studentRef === "object" ? studentRef.external_id : undefined;
        const sId = typeof studentRef === "object" ? studentRef.student_id : undefined;

        const studentResult = await findStudent(supabase, email, extId, sId);
        
        if (!studentResult.found) {
          results.push({ identifier: email || extId || sId, success: false, error: studentResult.error });
          continue;
        }

        const payload: DirectStudentPayload = {
          title,
          description,
          skill_tags,
          xp_reward,
          coin_reward,
          printable_url,
          external_ref: external_ref ? `${external_ref}_${studentResult.student_id}` : undefined,
          source,
          questions,
        };

        const result = await createPracticeSet(payload, studentResult.student_id!, supabase);
        results.push({
          identifier: email || extId || sId,
          student_id: studentResult.student_id,
          success: result.success,
          practice_set_id: result.practice_set_id,
          error: result.error,
        });
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({
          message: `Pushed to ${successful} students, ${failed} failed`,
          results,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (body.action === "find_student") {
      // Look up a student by email or external ID
      const { student_email, student_external_id, student_id } = body;

      const result = await findStudent(supabase, student_email, student_external_id, student_id);

      if (!result.found) {
        return new Response(
          JSON.stringify({ found: false, error: result.error }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get student profile info
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", result.student_id)
        .single();

      const { data: studentProfile } = await supabase
        .from("student_profiles")
        .select("xp, coins, current_streak")
        .eq("user_id", result.student_id)
        .single();

      return new Response(
        JSON.stringify({
          found: true,
          student: {
            id: result.student_id,
            name: profile?.full_name,
            xp: studentProfile?.xp || 0,
            coins: studentProfile?.coins || 0,
            streak: studentProfile?.current_streak || 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body",
          hint: "Available actions: 'push_to_student' | 'bulk_push_to_students' | 'find_student' | 'list_classes' | 'list_standards' | 'get_student_progress' | 'pre_register_students' | 'list_pending_enrollments' | 'create_class'. Or send assignment with class_id and title."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Error in teacher-push function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
