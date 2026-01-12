import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key from external apps
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('SISTER_APP_API_KEY');
    
    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';
    const classId = url.searchParams.get('class_id');
    const studentId = url.searchParams.get('student_id');

    console.log(`Student sync request: action=${action}, class_id=${classId}, student_id=${studentId}`);

    // Handle different actions
    switch (action) {
      case 'list': {
        // List all students, optionally filtered by class
        let query = supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            email,
            student_id,
            class_id,
            classes (
              id,
              name,
              class_period,
              school_year
            )
          `);
        
        if (classId) {
          query = query.eq('class_id', classId);
        }
        
        const { data: students, error } = await query;
        
        if (error) {
          console.error('Error fetching students:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch students', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, students }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get': {
        // Get a specific student with their grade history
        if (!studentId) {
          return new Response(
            JSON.stringify({ error: 'student_id is required for get action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: student, error: studentError } = await supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            email,
            student_id,
            class_id,
            classes (
              id,
              name,
              class_period,
              school_year
            )
          `)
          .eq('id', studentId)
          .single();

        if (studentError) {
          return new Response(
            JSON.stringify({ error: 'Student not found', details: studentError.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get grade history
        const { data: grades } = await supabase
          .from('grade_history')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(50);

        // Get diagnostic results
        const { data: diagnostics } = await supabase
          .from('diagnostic_results')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({ 
            success: true, 
            student,
            grades: grades || [],
            diagnostics: diagnostics || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'classes': {
        // List all classes
        const { data: classes, error } = await supabase
          .from('classes')
          .select('id, name, class_period, school_year, teacher_id');

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch classes', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, classes }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'grades': {
        // Get grade history for a student or class
        let query = supabase
          .from('grade_history')
          .select(`
            *,
            students (
              id,
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false });

        if (studentId) {
          query = query.eq('student_id', studentId);
        }

        const { data: grades, error } = await query.limit(100);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch grades', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, grades }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Unknown action',
            available_actions: ['list', 'get', 'classes', 'grades']
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in student-sync:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
