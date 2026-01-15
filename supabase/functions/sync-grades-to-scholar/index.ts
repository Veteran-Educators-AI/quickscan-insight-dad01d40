/**
 * ============================================================================
 * SYNC GRADES TO SCHOLAR EDGE FUNCTION
 * ============================================================================
 * 
 * Syncs comprehensive student learning data to NYCLogic Scholar AI including:
 * - Grade history with performance metrics
 * - Misconceptions identified from work analysis
 * - Recommended remediation topics
 * - Skill gaps and weak areas
 * 
 * Scholar uses this data to:
 * 1. Auto-assign targeted remediation practice
 * 2. Display misconception patterns to students
 * 3. Personalize learning paths based on weaknesses
 * 4. Award XP/coins for improvement on weak topics
 * 
 * REQUIRED SECRETS:
 * - SISTER_APP_API_KEY: The API key for authenticating with Scholar
 * - NYCOLOGIC_API_URL: The endpoint URL of Scholar app
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

interface MisconceptionData {
  name: string;
  description: string | null;
  confidence: number | null;
  topic_name: string | null;
}

interface GradeEntry {
  topic_name: string;
  grade: number;
  regents_score: number | null;
  nys_standard: string | null;
  grade_justification: string | null;
  created_at: string;
}

interface StudentLearningProfile {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  overall_average: number;
  grades: GradeEntry[];
  misconceptions: MisconceptionData[];
  weak_topics: { topic_name: string; avg_score: number }[];
  recommended_remediation: string[];
  xp_potential: number;
  coin_potential: number;
}

interface BatchSyncPayload {
  action: 'batch_sync';
  teacher_id: string;
  teacher_name: string | null;
  sync_timestamp: string;
  student_profiles: StudentLearningProfile[];
  summary: {
    total_students: number;
    total_grades: number;
    total_misconceptions: number;
    weak_topics_identified: number;
  };
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
    const { class_id, student_ids } = requestData;

    // Get teacher info
    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Get teacher settings for XP/coin multipliers
    const { data: settings } = await supabase
      .from('settings')
      .select('sister_app_xp_multiplier, sister_app_coin_multiplier')
      .eq('teacher_id', user.id)
      .single();

    const xpMultiplier = settings?.sister_app_xp_multiplier || 1;
    const coinMultiplier = settings?.sister_app_coin_multiplier || 1;

    // Get students to sync
    let studentQuery = supabase
      .from('students')
      .select('id, first_name, last_name, class_id, classes(name)')
      .eq('classes.teacher_id', user.id);

    if (student_ids && student_ids.length > 0) {
      studentQuery = studentQuery.in('id', student_ids);
    } else if (class_id) {
      studentQuery = studentQuery.eq('class_id', class_id);
    }

    const { data: students, error: studentsError } = await studentQuery;

    if (studentsError || !students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No students to sync', synced_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studentIds = students.map(s => s.id);

    // Fetch all grades for these students
    const { data: grades, error: gradesError } = await supabase
      .from('grade_history')
      .select('student_id, topic_name, grade, regents_score, nys_standard, grade_justification, created_at')
      .in('student_id', studentIds)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (gradesError) {
      console.error('Error fetching grades:', gradesError);
    }

    // Fetch misconceptions from attempts
    const { data: attempts } = await supabase
      .from('attempts')
      .select('student_id, attempt_misconceptions(misconception_id, confidence, misconception_tags(name, description, topics(name)))')
      .in('student_id', studentIds);

    // Build comprehensive learning profiles for each student
    const studentProfiles: StudentLearningProfile[] = [];
    let totalMisconceptions = 0;
    let totalWeakTopics = 0;

    for (const student of students) {
      const studentGrades = (grades || []).filter(g => g.student_id === student.id);
      const studentAttempts = (attempts || []).filter(a => a.student_id === student.id);

      // Calculate overall average
      const avgGrade = studentGrades.length > 0
        ? Math.round(studentGrades.reduce((sum, g) => sum + g.grade, 0) / studentGrades.length)
        : 0;

      // Extract misconceptions
      const misconceptions: MisconceptionData[] = [];
      const misconceptionSet = new Set<string>();
      
      for (const attempt of studentAttempts) {
        const attemptMisconceptions = attempt.attempt_misconceptions as any[];
        if (attemptMisconceptions) {
          for (const am of attemptMisconceptions) {
            const tag = am.misconception_tags as any;
            if (tag && !misconceptionSet.has(tag.name)) {
              misconceptionSet.add(tag.name);
              misconceptions.push({
                name: tag.name,
                description: tag.description,
                confidence: am.confidence,
                topic_name: tag.topics?.name || null,
              });
            }
          }
        }
      }
      totalMisconceptions += misconceptions.length;

      // Calculate weak topics (topics with avg < 70%)
      const topicScores: Record<string, number[]> = {};
      for (const g of studentGrades) {
        if (!topicScores[g.topic_name]) {
          topicScores[g.topic_name] = [];
        }
        topicScores[g.topic_name].push(g.grade);
      }

      const weakTopics: { topic_name: string; avg_score: number }[] = [];
      for (const [topic, scores] of Object.entries(topicScores)) {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        if (avg < 70) {
          weakTopics.push({ topic_name: topic, avg_score: avg });
        }
      }
      weakTopics.sort((a, b) => a.avg_score - b.avg_score);
      totalWeakTopics += weakTopics.length;

      // Generate remediation recommendations based on weak topics and misconceptions
      const recommendedRemediation: string[] = [];
      
      // Add weak topics as remediation priorities
      for (const wt of weakTopics.slice(0, 5)) {
        recommendedRemediation.push(`Practice: ${wt.topic_name} (current: ${wt.avg_score}%)`);
      }
      
      // Add topics from misconceptions
      for (const m of misconceptions.slice(0, 3)) {
        if (m.topic_name && !recommendedRemediation.some(r => r.includes(m.topic_name!))) {
          recommendedRemediation.push(`Address misconception: ${m.name} in ${m.topic_name}`);
        }
      }

      // Calculate XP/coin potential based on improvement opportunity
      const improvementPotential = Math.max(0, 100 - avgGrade);
      const xpPotential = Math.round(improvementPotential * 2 * xpMultiplier);
      const coinPotential = Math.round(improvementPotential * coinMultiplier);

      const classData = student.classes as any;
      studentProfiles.push({
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        class_id: student.class_id,
        class_name: classData?.name || 'Unknown',
        overall_average: avgGrade,
        grades: studentGrades.map(g => ({
          topic_name: g.topic_name,
          grade: g.grade,
          regents_score: g.regents_score,
          nys_standard: g.nys_standard,
          grade_justification: g.grade_justification,
          created_at: g.created_at,
        })),
        misconceptions,
        weak_topics: weakTopics,
        recommended_remediation: recommendedRemediation,
        xp_potential: xpPotential,
        coin_potential: coinPotential,
      });
    }

    // Build single batch payload
    const batchPayload: BatchSyncPayload = {
      action: 'batch_sync',
      teacher_id: user.id,
      teacher_name: teacherProfile?.full_name || null,
      sync_timestamp: new Date().toISOString(),
      student_profiles: studentProfiles,
      summary: {
        total_students: studentProfiles.length,
        total_grades: (grades || []).length,
        total_misconceptions: totalMisconceptions,
        weak_topics_identified: totalWeakTopics,
      },
    };

    console.log('Syncing comprehensive data to Scholar:', JSON.stringify(batchPayload.summary));

    // First, try to detect if we're syncing to our own receive-sister-app-data function
    // or to an external Scholar API that might have a different format
    let response: Response;
    let responseText: string;
    
    try {
      // Attempt the sync with batch_sync format first
      response = await fetch(sisterAppEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': sisterAppApiKey,
        },
        body: JSON.stringify(batchPayload),
      });

      responseText = await response.text();
      
      // If we get "Unknown payload type", try alternative format for external Scholar APIs
      if (!response.ok && responseText.includes('Unknown payload type')) {
        console.log('External Scholar API detected, trying alternative sync format...');
        
        // Try sending individual student syncs in a format external Scholar might expect
        const alternativePayload = {
          type: 'learning_data_sync',
          source: 'nycologic_ai',
          teacher_id: user.id,
          teacher_name: teacherProfile?.full_name || null,
          timestamp: new Date().toISOString(),
          students: studentProfiles.map(profile => ({
            id: profile.student_id,
            name: profile.student_name,
            class_id: profile.class_id,
            class_name: profile.class_name,
            average_grade: profile.overall_average,
            recent_grades: profile.grades.slice(0, 10).map(g => ({
              topic: g.topic_name,
              score: g.grade,
              regents: g.regents_score,
              standard: g.nys_standard,
              date: g.created_at,
            })),
            identified_misconceptions: profile.misconceptions.map(m => ({
              name: m.name,
              description: m.description,
              topic: m.topic_name,
              confidence: m.confidence,
            })),
            weak_areas: profile.weak_topics,
            remediation_recommendations: profile.recommended_remediation,
            rewards: {
              xp_potential: profile.xp_potential,
              coin_potential: profile.coin_potential,
            },
          })),
          summary: batchPayload.summary,
        };
        
        response = await fetch(sisterAppEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sisterAppApiKey,
          },
          body: JSON.stringify(alternativePayload),
        });
        
        responseText = await response.text();
      }
    } catch (fetchError) {
      console.error('Network error syncing to Scholar:', fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Connection failed'}. Please check NYCOLOGIC_API_URL is correct.`,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('Scholar app error:', response.status, responseText);
      
      // Provide helpful error messages based on the error
      let errorMessage = `Scholar sync failed (${response.status})`;
      let suggestion = '';
      
      if (responseText.includes('Unknown payload type')) {
        errorMessage = 'Scholar API does not recognize the sync format';
        suggestion = 'The external Scholar API may require a different payload format. Please check the Scholar API documentation or contact support.';
      } else if (responseText.includes('Invalid API key') || response.status === 401) {
        errorMessage = 'Authentication failed';
        suggestion = 'Please verify the SISTER_APP_API_KEY is correct for the target Scholar instance.';
      } else if (response.status === 404) {
        errorMessage = 'Scholar API endpoint not found';
        suggestion = 'Please verify NYCOLOGIC_API_URL points to the correct Scholar API endpoint.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: responseText,
          suggestion,
          status: response.status 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Log the sync action
    await supabase.from('sister_app_sync_log').insert({
      teacher_id: user.id,
      action: 'batch_sync',
      data: {
        ...batchPayload.summary,
        class_id,
        response: responseData,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        synced_students: studentProfiles.length,
        synced_grades: (grades || []).length,
        misconceptions_synced: totalMisconceptions,
        weak_topics_synced: totalWeakTopics,
        response: responseData,
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
