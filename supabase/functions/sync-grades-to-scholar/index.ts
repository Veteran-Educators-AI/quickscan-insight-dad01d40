/**
 * ============================================================================
 * SYNC GRADES TO SCHOLAR EDGE FUNCTION
 * ============================================================================
 * 
 * This function syncs student grade history to NYCLogic Scholar AI so students
 * can view their grades, track progress, and earn XP/coins for their work.
 * 
 * REQUIRED SECRETS:
 * - SISTER_APP_API_KEY: The API key for authenticating with the sister app
 * - NYCOLOGIC_API_URL: The endpoint URL of the sister app
 * 
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  class_id?: string;
  student_ids?: string[];
  sync_all?: boolean;
}

interface GradeData {
  student_id: string;
  student_name: string;
  topic_name: string;
  grade: number;
  regents_score: number | null;
  nys_standard: string | null;
  grade_justification: string | null;
  created_at: string;
  xp_reward: number;
  coin_reward: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sisterAppApiKey = Deno.env.get('SISTER_APP_API_KEY');
    const sisterAppEndpoint = Deno.env.get('NYCOLOGIC_API_URL');
    
    if (!sisterAppApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sister app API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sisterAppEndpoint) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sister app endpoint URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: SyncRequest = await req.json();
    const { class_id, student_ids, sync_all } = requestData;

    // Get teacher settings for XP/coin multipliers
    const { data: settings } = await supabase
      .from('settings')
      .select('sister_app_xp_multiplier, sister_app_coin_multiplier')
      .eq('teacher_id', user.id)
      .single();

    const xpMultiplier = settings?.sister_app_xp_multiplier || 1;
    const coinMultiplier = settings?.sister_app_coin_multiplier || 1;

    // Build query for grade history
    let query = supabase
      .from('grade_history')
      .select(`
        id,
        student_id,
        topic_name,
        grade,
        regents_score,
        nys_standard,
        grade_justification,
        created_at,
        student:students(first_name, last_name, class_id)
      `)
      .eq('teacher_id', user.id);

    // Apply filters
    if (student_ids && student_ids.length > 0) {
      query = query.in('student_id', student_ids);
    } else if (class_id) {
      // Get students in this class first
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', class_id);
      
      if (classStudents && classStudents.length > 0) {
        query = query.in('student_id', classStudents.map(s => s.id));
      }
    }

    const { data: grades, error: gradesError } = await query.order('created_at', { ascending: false });

    if (gradesError) {
      console.error('Error fetching grades:', gradesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch grades' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!grades || grades.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No grades to sync', synced_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform grades for sister app
    const gradesData: GradeData[] = grades.map((g: any) => {
      const baseXp = Math.round(g.grade * 0.5); // Base XP from grade percentage
      const baseCoin = Math.round(g.grade * 0.25); // Base coins from grade
      
      return {
        student_id: g.student_id,
        student_name: g.student ? `${g.student.first_name} ${g.student.last_name}` : 'Unknown',
        topic_name: g.topic_name,
        grade: g.grade,
        regents_score: g.regents_score,
        nys_standard: g.nys_standard,
        grade_justification: g.grade_justification,
        created_at: g.created_at,
        xp_reward: Math.round(baseXp * xpMultiplier),
        coin_reward: Math.round(baseCoin * coinMultiplier),
      };
    });

    // Group grades by student for efficient push
    const gradesByStudent = gradesData.reduce((acc, grade) => {
      if (!acc[grade.student_id]) {
        acc[grade.student_id] = [];
      }
      acc[grade.student_id].push(grade);
      return acc;
    }, {} as Record<string, GradeData[]>);

    // Push grades to sister app - send one request per grade using the expected format
    console.log('Syncing grades to Scholar:', gradesData.length, 'grades for', Object.keys(gradesByStudent).length, 'students');

    let successCount = 0;
    let errorCount = 0;

    for (const grade of gradesData) {
      // Use the payload format expected by receive-sister-app-data
      const payload = {
        action: 'grade_completed',
        student_id: grade.student_id,
        data: {
          activity_type: 'scanned_work',
          activity_name: grade.topic_name,
          score: grade.grade,
          topic_name: grade.topic_name,
          xp_earned: grade.xp_reward,
          coins_earned: grade.coin_reward,
          nys_standard: grade.nys_standard,
          regents_score: grade.regents_score,
          grade_justification: grade.grade_justification,
          timestamp: grade.created_at,
          source: 'nycologic_ai_sync',
        },
      };

      try {
        const response = await fetch(sisterAppEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sisterAppApiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          successCount++;
        } else {
          const errorText = await response.text();
          console.error('Sister app error for grade:', response.status, errorText);
          errorCount++;
        }
      } catch (fetchError) {
        console.error('Fetch error for grade:', fetchError);
        errorCount++;
      }
    }

    console.log('Sync complete:', successCount, 'succeeded,', errorCount, 'failed');

    // Log the sync action
    await supabase.from('sister_app_sync_log').insert({
      teacher_id: user.id,
      action: 'sync_grades',
      data: {
        total_grades: gradesData.length,
        total_students: Object.keys(gradesByStudent).length,
        success_count: successCount,
        error_count: errorCount,
        class_id,
      },
    });

    // Return appropriate response based on results
    if (errorCount > 0 && successCount === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All grade syncs failed',
          synced_count: 0,
          failed_count: errorCount,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced_count: successCount,
        failed_count: errorCount,
        student_count: Object.keys(gradesByStudent).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-grades-to-scholar:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
