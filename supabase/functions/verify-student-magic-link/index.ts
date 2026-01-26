import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the magic link
    const { data: magicLink, error: linkError } = await supabase
      .from('student_magic_links')
      .select('id, email, class_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (linkError || !magicLink) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already used
    if (magicLink.used_at) {
      return new Response(JSON.stringify({ success: false, error: "This link has already been used" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (new Date(magicLink.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: "This link has expired. Ask your teacher for a new one." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the class info
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .eq('id', magicLink.class_id)
      .single();

    if (classError || !classData) {
      return new Response(JSON.stringify({ success: false, error: "Class not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if student already exists in this class (by email)
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, first_name, last_name, user_id')
      .eq('class_id', classData.id)
      .eq('email', magicLink.email)
      .maybeSingle();

    let studentId: string;
    let studentName: string;

    if (existingStudent) {
      // Student already exists - just use their info
      studentId = existingStudent.id;
      studentName = `${existingStudent.first_name} ${existingStudent.last_name}`;
    } else {
      // Create a new student record
      // Extract name from email (best effort)
      const emailParts = magicLink.email.split('@')[0];
      const nameParts = emailParts.split(/[._-]/).filter(Boolean);
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Student';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';

      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert({
          class_id: classData.id,
          first_name: firstName,
          last_name: lastName,
          email: magicLink.email,
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create student:", createError);
        return new Response(JSON.stringify({ success: false, error: "Failed to create student record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      studentId = newStudent.id;
      studentName = `${firstName} ${lastName}`.trim();
    }

    // Mark the magic link as used
    await supabase
      .from('student_magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', magicLink.id);

    console.log("Student joined class:", {
      studentId,
      studentName,
      className: classData.name,
      email: magicLink.email,
    });

    return new Response(JSON.stringify({
      success: true,
      studentId,
      studentName,
      className: classData.name,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in verify-student-magic-link:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
