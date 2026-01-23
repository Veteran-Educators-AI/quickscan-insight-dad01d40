import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface StudentSyncPayload {
  student_id?: string;
  external_id?: string;
  id?: string;
  email?: string;
  full_name?: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  grade_level?: number;
  class_id?: string;
  class_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  overall_average?: number;
  grades?: any[];
  misconceptions?: any[];
  weak_topics?: any[];
  remediation_recommendations?: any[];
  skill_tags?: string[];
  xp_potential?: number;
  coin_potential?: number;
  source?: string;
  sync_timestamp?: string;
}

async function verifyApiKey(apiKey: string, supabaseUrl: string, supabaseKey: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check both integration_tokens and api_tokens tables with plain token match
  const { data: token1 } = await supabase
    .from("integration_tokens")
    .select("id, is_active")
    .eq("token_hash", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  const { data: token2 } = await supabase
    .from("api_tokens")
    .select("id, is_active")
    .eq("token_hash", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  const token = token1 || token2;

  if (token) {
    // Update last_used_at
    if (token1) {
      await supabase
        .from("integration_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", token.id);
    } else {
      await supabase
        .from("api_tokens")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", token.id);
    }
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      console.log("Missing API key in request");
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifyApiKey(apiKey, supabaseUrl, supabaseServiceKey);
    if (!isValid) {
      console.log("Invalid API key:", apiKey.substring(0, 10) + "...");
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("API key validated successfully");

    const body = await req.json();
    console.log("Received sync payload:", JSON.stringify(body).substring(0, 500));
    
    // Support both single student and bulk sync
    const students: StudentSyncPayload[] = body.students || [body];
    const results: { external_id: string; full_name: string; status: string; error?: string }[] = [];

    for (const student of students) {
      try {
        // Build external_id - prefer provided, fallback to student_id or id
        const externalId = student.external_id || student.student_id || student.id;
        
        if (!externalId) {
          results.push({
            external_id: "unknown",
            full_name: "unknown",
            status: "error",
            error: "Missing external_id, student_id, or id"
          });
          continue;
        }

        // Build full_name
        let fullName = student.full_name || student.student_name;
        if (!fullName && (student.first_name || student.last_name)) {
          fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
        }
        if (!fullName) {
          fullName = 'Unknown Student';
        }

        // Prepare the external student record
        const externalStudent = {
          external_id: externalId,
          email: student.email || null,
          full_name: fullName,
          first_name: student.first_name || null,
          last_name: student.last_name || null,
          grade_level: student.grade_level || null,
          class_id: student.class_id || null,
          class_name: student.class_name || null,
          teacher_id: student.teacher_id || null,
          teacher_name: student.teacher_name || null,
          overall_average: student.overall_average || null,
          grades: student.grades || [],
          misconceptions: student.misconceptions || [],
          weak_topics: student.weak_topics || [],
          remediation_recommendations: student.remediation_recommendations || [],
          skill_tags: student.skill_tags || null,
          xp_potential: student.xp_potential || 100,
          coin_potential: student.coin_potential || 25,
          source: student.source || 'nycologic',
          sync_timestamp: student.sync_timestamp || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log(`Syncing external student: ${fullName} (${externalId})`);

        // Upsert into external_students table
        const { error: upsertError } = await supabase
          .from('external_students')
          .upsert(externalStudent, {
            onConflict: 'external_id,source',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Error syncing student ${fullName}:`, upsertError);
          results.push({
            external_id: externalId,
            full_name: fullName,
            status: "error",
            error: upsertError.message
          });
          continue;
        }

        console.log(`Successfully synced student: ${fullName}`);
        results.push({
          external_id: externalId,
          full_name: fullName,
          status: "synced"
        });

      } catch (err) {
        const externalId = student.external_id || student.student_id || student.id || "unknown";
        console.error(`Error syncing student ${externalId}:`, err);
        results.push({
          external_id: externalId,
          full_name: student.full_name || student.student_name || "unknown",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }

    // Log the webhook event
    const successCount = results.filter(r => r.status === "synced").length;
    await supabase.from("webhook_event_logs").insert({
      event_type: "student_sync_external",
      payload: { student_count: students.length },
      status: successCount === students.length ? "success" : 
              successCount > 0 ? "partial" : "failed",
      processed_at: new Date().toISOString(),
      response: { synced: successCount, total: students.length, results: results.slice(0, 20) },
    });

    console.log(`Synced ${successCount}/${students.length} students to external_students table`);

    // Push weakness data to GeoBlox for students that have it
    const geobloxApiKey = Deno.env.get("GEOBLOX_API_KEY");
    if (geobloxApiKey) {
      const studentsWithWeaknesses = students.filter(s => 
        s.weak_topics?.length || s.misconceptions?.length || s.skill_tags?.length
      );

      if (studentsWithWeaknesses.length > 0) {
        console.log(`Pushing ${studentsWithWeaknesses.length} students with weakness data to GeoBlox...`);
        
        // Push each student to GeoBlox using the correct format
        for (const s of studentsWithWeaknesses) {
          try {
            const studentId = s.external_id || s.student_id || s.id;
            const geobloxResponse = await fetch("https://wedghtmkaxkxrrbbeenq.supabase.co/functions/v1/scholar-sync", {
              method: "POST",
              headers: {
                "x-api-key": geobloxApiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "sync_student",
                data: {
                  scholar_student_id: studentId,
                  nickname: s.full_name || s.student_name || "Student",
                  grade: s.grade_level ? `${s.grade_level}th` : "6th",
                  mastery_data: [],
                  standards_progress: {
                    weak_topics: s.weak_topics || [],
                    misconceptions: s.misconceptions || [],
                    skill_tags: s.skill_tags || [],
                    overall_average: s.overall_average,
                    remediation_recommendations: s.remediation_recommendations || [],
                  },
                },
              }),
            });

            if (geobloxResponse.ok) {
              console.log(`Successfully synced student ${studentId} to GeoBlox`);
            } else {
              const errorText = await geobloxResponse.text();
              console.error(`GeoBlox push failed for ${studentId}:`, geobloxResponse.status, errorText);
            }
          } catch (err) {
            console.error(`GeoBlox push error for student:`, err);
          }
        }

        await supabase.from("webhook_event_logs").insert({
          event_type: "geoblox_auto_push",
          status: "success",
          payload: { students_count: studentsWithWeaknesses.length },
        });
      }
    } else {
      console.log("GEOBLOX_API_KEY not configured, skipping GeoBlox push");
    }

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Synced ${successCount}/${students.length} students to external_students table`,
        synced: successCount,
        total: students.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});