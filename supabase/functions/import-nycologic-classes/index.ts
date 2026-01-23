import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
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

    console.log("Starting import-nycologic-classes function");
    console.log("NYCOLOGIC_API_URL configured:", !!nycologicApiUrl);
    
    if (nycologicApiUrl) {
      console.log("API URL (first 50 chars):", nycologicApiUrl.substring(0, 50));
    }

    if (!nycologicApiUrl) {
      return new Response(
        JSON.stringify({ error: "NYCOLOGIC_API_URL not configured", configured: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log("User auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.email);

    // Check if user is a teacher
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "teacher") {
      console.log("User is not a teacher:", roleData?.role);
      return new Response(
        JSON.stringify({ error: "Only teachers can import classes" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching classes from NYCologic AI for teacher ${user.email}...`);

    // Fetch classes from NYCologic AI with timeout
    let response: Response;
    try {
      response = await fetchWithTimeout(nycologicApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-source-app": "scholar-app",
        },
        body: JSON.stringify({
          source: "scholar-app",
          action: "get_teacher_classes",
          timestamp: new Date().toISOString(),
          data: {
            teacher_email: user.email,
            teacher_id: user.id,
          },
        }),
      }, 15000); // 15 second timeout
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
      console.error("Fetch to NYCologic API failed:", errorMsg);
      
      if (errorMsg.includes("aborted") || errorMsg.includes("timeout")) {
        return new Response(
          JSON.stringify({ 
            error: "NYCologic Ai API timed out - the server may be slow or unreachable", 
            details: errorMsg,
            imported: 0,
            skipped: 0,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to connect to NYCologic Ai API", 
          details: errorMsg,
          imported: 0,
          skipped: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("NYCologic API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NYCologic API error response:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch classes from NYCologic Ai", 
          status: response.status,
          details: errorText.substring(0, 500),
          imported: 0,
          skipped: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseText = await response.text();
    console.log("NYCologic API response (first 500 chars):", responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse NYCologic response as JSON");
      return new Response(
        JSON.stringify({ 
          error: "NYCologic Ai API returned invalid JSON", 
          details: responseText.substring(0, 200),
          imported: 0,
          skipped: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nycologicClasses = result.classes || [];
    console.log("Found", nycologicClasses.length, "classes from NYCologic");

    if (!nycologicClasses.length) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No classes found in NYCologic Ai",
          imported: 0,
          skipped: 0,
          students_enrolled: 0,
          students_pending: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing classes for this teacher
    const { data: existingClasses } = await supabase
      .from("classes")
      .select("name, class_code, id")
      .eq("teacher_id", user.id);

    const existingNames = new Set(existingClasses?.map(c => c.name.toLowerCase()) || []);
    const existingCodes = new Set(existingClasses?.map(c => c.class_code) || []);
    const classNameToId = new Map(existingClasses?.map(c => [c.name.toLowerCase(), c.id]) || []);

    let imported = 0;
    let skipped = 0;
    const importedClasses: Array<{ name: string; class_code: string }> = [];

    for (const nycClass of nycologicClasses) {
      // Skip if class name already exists
      if (existingNames.has(nycClass.name.toLowerCase())) {
        console.log("Skipping existing class:", nycClass.name);
        skipped++;
        continue;
      }

      // Generate unique class code
      let classCode = nycClass.class_code || generateClassCode();
      while (existingCodes.has(classCode)) {
        classCode = generateClassCode();
      }

      // Insert the class
      const { data: newClass, error: insertError } = await supabase
        .from("classes")
        .insert({
          name: nycClass.name,
          class_code: classCode,
          teacher_id: user.id,
          subject: nycClass.subject || null,
          grade_band: nycClass.grade_band || null,
          grade_level: nycClass.grade_level || null,
        })
        .select("id, name, class_code")
        .single();

      if (insertError) {
        console.error(`Failed to import class ${nycClass.name}:`, insertError);
        skipped++;
        continue;
      }

      existingCodes.add(classCode);
      existingNames.add(nycClass.name.toLowerCase());
      classNameToId.set(nycClass.name.toLowerCase(), newClass.id);
      imported++;
      importedClasses.push({ name: newClass.name, class_code: newClass.class_code });
      console.log("Imported class:", newClass.name);
    }

    console.log(`Imported ${imported} classes, skipped ${skipped}`);

    // Now sync students for all classes (both imported and existing)
    // Process students in parallel batches to speed up
    let studentsEnrolled = 0;
    let studentsPending = 0;

    // Fetch students for each NYCologic class - limit to 3 parallel requests
    const studentPromises = nycologicClasses.slice(0, 10).map(async (nycClass: { name: string; id?: string }) => {
      const classId = classNameToId.get(nycClass.name.toLowerCase());
      if (!classId) return { enrolled: 0, pending: 0 };

      try {
        // Fetch enrolled students from NYCologic AI with timeout
        const studentsResponse = await fetchWithTimeout(nycologicApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-source-app": "scholar-app",
          },
          body: JSON.stringify({
            source: "scholar-app",
            action: "get_class_students",
            timestamp: new Date().toISOString(),
            data: {
              class_name: nycClass.name,
              class_id: nycClass.id,
              teacher_email: user.email,
            },
          }),
        }, 10000); // 10 second timeout per class

        if (!studentsResponse.ok) {
          console.error(`Failed to fetch students for class ${nycClass.name}: status ${studentsResponse.status}`);
          return { enrolled: 0, pending: 0 };
        }

        const studentsResult = await studentsResponse.json();
        const students = studentsResult.students || [];
        console.log(`Found ${students.length} students for class ${nycClass.name}`);

        let localEnrolled = 0;
        let localPending = 0;

        for (const student of students) {
          if (!student.email) continue;

          // Check if student user exists by user_id from NYCologic
          const studentUserId = student.user_id;

          if (studentUserId) {
            // Check if profile exists for this user
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", studentUserId)
              .maybeSingle();

            if (existingProfile) {
              // Check if already enrolled
              const { data: existingEnrollment } = await supabase
                .from("enrollments")
                .select("id")
                .eq("class_id", classId)
                .eq("student_id", studentUserId)
                .maybeSingle();

              if (existingEnrollment) {
                // Already enrolled, skip
                continue;
              }

              // Enroll the student
              const { error: enrollError } = await supabase
                .from("enrollments")
                .insert({
                  class_id: classId,
                  student_id: studentUserId,
                });

              if (enrollError) {
                console.error(`Failed to enroll student ${student.email}:`, enrollError.message);
                // Add to pending enrollments if direct enrollment fails
                await supabase
                  .from("pending_enrollments")
                  .upsert({
                    class_id: classId,
                    email: student.email,
                    student_name: student.name || null,
                    teacher_id: user.id,
                    processed: false,
                  }, { onConflict: "class_id,email" });
                localPending++;
              } else {
                localEnrolled++;
              }
            } else {
              // Profile doesn't exist, add to pending
              await supabase
                .from("pending_enrollments")
                .upsert({
                  class_id: classId,
                  email: student.email,
                  student_name: student.name || null,
                  teacher_id: user.id,
                  processed: false,
                }, { onConflict: "class_id,email" });
              localPending++;
            }
          } else {
            // No user_id, add to pending enrollments
            await supabase
              .from("pending_enrollments")
              .upsert({
                class_id: classId,
                email: student.email,
                student_name: student.name || null,
                teacher_id: user.id,
                processed: false,
              }, { onConflict: "class_id,email" });
            localPending++;
          }
        }

        return { enrolled: localEnrolled, pending: localPending };
      } catch (error) {
        console.error(`Error processing students for class ${nycClass.name}:`, error);
        return { enrolled: 0, pending: 0 };
      }
    });

    const studentResults = await Promise.all(studentPromises);
    for (const result of studentResults) {
      studentsEnrolled += result.enrolled;
      studentsPending += result.pending;
    }

    console.log(`Enrolled ${studentsEnrolled} students, ${studentsPending} pending`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported,
        skipped,
        classes: importedClasses,
        students_enrolled: studentsEnrolled,
        students_pending: studentsPending,
        synced_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage, imported: 0, skipped: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
