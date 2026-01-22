import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEOBLOX_API_URL = "https://wedghtmkaxkxrrbbeenq.supabase.co/functions/v1/scholar-sync";

interface StudentMasteryData {
  standard_id: string;
  mastery_level: string;
  attempts_count: number;
  correct_count: number;
}

interface SyncStudentPayload {
  scholar_student_id: string;
  nickname: string;
  grade: string;
  mastery_data?: StudentMasteryData[];
  standards_progress?: Record<string, unknown>;
}

interface AssignContentPayload {
  class_id: string;
  assigned_by: string;
  content_type: string;
  content_ids: string[];
  title: string;
  description: string;
  due_date: string;
  difficulty_level: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geobloxApiKey = Deno.env.get("GEOBLOX_API_KEY");

    if (!geobloxApiKey) {
      return new Response(
        JSON.stringify({ error: "GEOBLOX_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sync_student";

    // Action: sync_student - Push a student's data to GeoBlox
    if (action === "sync_student") {
      const body = await req.json();
      const studentId = body.student_id || body.scholar_student_id;

      if (!studentId) {
        return new Response(
          JSON.stringify({ error: "student_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Syncing student ${studentId} to GeoBlox...`);

      // Fetch student data from our database
      const { data: student, error: studentError } = await supabase
        .from("external_students")
        .select("*")
        .eq("external_id", studentId)
        .maybeSingle();

      // Also try to get mastery data if student is linked
      let masteryData: StudentMasteryData[] = [];
      if (student?.linked_user_id) {
        const { data: mastery } = await supabase
          .from("student_standard_mastery")
          .select("standard_id, mastery_level, attempts_count, correct_count")
          .eq("student_id", student.linked_user_id);
        
        if (mastery) {
          masteryData = mastery;
        }
      }

      const payload: SyncStudentPayload = {
        scholar_student_id: studentId,
        nickname: student?.full_name || body.nickname || "Student",
        grade: student?.grade_level ? `${student.grade_level}th` : body.grade || "6th",
        mastery_data: masteryData,
        standards_progress: {
          weak_topics: student?.weak_topics || [],
          misconceptions: student?.misconceptions || [],
          skill_tags: student?.skill_tags || [],
          overall_average: student?.overall_average,
        },
      };

      const geobloxResponse = await fetch(GEOBLOX_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": geobloxApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sync_student",
          data: payload,
        }),
      });

      const responseText = await geobloxResponse.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      if (!geobloxResponse.ok) {
        console.error("GeoBlox sync_student error:", result);
        return new Response(
          JSON.stringify({ error: "Failed to sync student to GeoBlox", status: geobloxResponse.status, details: result }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Sync student successful:", result);

      await supabase.from("webhook_event_logs").insert({
        event_type: "geoblox_sync_student",
        status: "success",
        payload: { student_id: studentId },
        response: result,
      });

      return new Response(
        JSON.stringify({ success: true, student_id: studentId, geoblox_response: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: sync_all - Sync all external students to GeoBlox
    if (action === "sync_all") {
      console.log("Syncing all students to GeoBlox...");

      const { data: students, error } = await supabase
        .from("external_students")
        .select("external_id, full_name, grade_level, weak_topics, misconceptions, skill_tags, overall_average, linked_user_id");

      if (error || !students) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch students", details: error?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const student of students) {
        // Get mastery data if linked
        let masteryData: StudentMasteryData[] = [];
        if (student.linked_user_id) {
          const { data: mastery } = await supabase
            .from("student_standard_mastery")
            .select("standard_id, mastery_level, attempts_count, correct_count")
            .eq("student_id", student.linked_user_id);
          if (mastery) masteryData = mastery;
        }

        const payload: SyncStudentPayload = {
          scholar_student_id: student.external_id,
          nickname: student.full_name || "Student",
          grade: student.grade_level ? `${student.grade_level}th` : "6th",
          mastery_data: masteryData,
          standards_progress: {
            weak_topics: student.weak_topics || [],
            misconceptions: student.misconceptions || [],
            skill_tags: student.skill_tags || [],
            overall_average: student.overall_average,
          },
        };

        try {
          const response = await fetch(GEOBLOX_API_URL, {
            method: "POST",
            headers: {
              "x-api-key": geobloxApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "sync_student", data: payload }),
          });

          results.push({
            student_id: student.external_id,
            status: response.ok ? "synced" : "failed",
            http_status: response.status,
          });
        } catch (err) {
          results.push({
            student_id: student.external_id,
            status: "error",
            error: err instanceof Error ? err.message : "Unknown",
          });
        }
      }

      const successCount = results.filter(r => r.status === "synced").length;

      await supabase.from("webhook_event_logs").insert({
        event_type: "geoblox_sync_all",
        status: successCount === students.length ? "success" : "partial",
        payload: { total: students.length, synced: successCount },
      });

      return new Response(
        JSON.stringify({ success: true, total: students.length, synced: successCount, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: get_progress - Get a student's GeoBlox progress
    if (action === "get_progress") {
      const body = await req.json();
      const studentId = body.student_id || body.scholar_student_id;

      if (!studentId) {
        return new Response(
          JSON.stringify({ error: "student_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Getting GeoBlox progress for student ${studentId}...`);

      const geobloxResponse = await fetch(GEOBLOX_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": geobloxApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_student_progress",
          data: { scholar_student_id: studentId },
        }),
      });

      const responseText = await geobloxResponse.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      if (!geobloxResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to get progress from GeoBlox", status: geobloxResponse.status, details: result }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, student_id: studentId, progress: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: assign_content - Teacher assigns content via GeoBlox
    if (action === "assign_content") {
      const body: AssignContentPayload = await req.json();

      const required = ["class_id", "assigned_by", "content_type", "content_ids", "title", "description", "due_date", "difficulty_level"];
      const missing = required.filter(f => !body[f as keyof AssignContentPayload]);
      
      if (missing.length > 0) {
        return new Response(
          JSON.stringify({ error: `Missing required fields: ${missing.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Assigning content to class ${body.class_id}...`);

      const geobloxResponse = await fetch(GEOBLOX_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": geobloxApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "assign_content",
          data: body,
        }),
      });

      const responseText = await geobloxResponse.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { raw: responseText };
      }

      if (!geobloxResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to assign content via GeoBlox", status: geobloxResponse.status, details: result }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("webhook_event_logs").insert({
        event_type: "geoblox_assign_content",
        status: "success",
        payload: body,
        response: result,
      });

      return new Response(
        JSON.stringify({ success: true, geoblox_response: result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: sync_student, sync_all, get_progress, or assign_content" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("GeoBlox sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
