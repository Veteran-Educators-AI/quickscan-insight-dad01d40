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
  test_connection?: boolean;
}

interface MisconceptionData {
  name: string;
  description: string | null;
  confidence: number | null;
  topic_name: string | null;
  standard: string | null;  // NYS standard code (e.g., "A.REI.4")
  problem_set: string | null;  // Worksheet/problem set title
  severity: string | null;  // high, medium, low
  suggested_remedies: string[] | null;
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
  student_email: string | null;  // Email for auto-linking on Scholar signup
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
    const { class_id, student_ids, test_connection } = requestData;

    // Handle test connection request - ping Scholar API directly
    if (test_connection) {
      console.log('Testing connection to Scholar API...');
      const baseEndpoint = sisterAppEndpoint.replace(/\/$/, '');
      
      try {
        const testPayload = {
          action: 'ping',
          timestamp: new Date().toISOString(),
        };
        
        const testResponse = await fetch(baseEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sisterAppApiKey,
          },
          body: JSON.stringify(testPayload),
        });

        const responseText = await testResponse.text();
        console.log('Scholar API response:', testResponse.status, responseText);

        if (testResponse.ok) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Successfully connected to Scholar API!',
              endpoint: baseEndpoint,
              status: testResponse.status,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Scholar API returned ${testResponse.status}: ${responseText.slice(0, 200)}`,
              endpoint: baseEndpoint,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (fetchError: unknown) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        console.error('Connection test failed:', fetchError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Network error: ${errorMessage}`,
            endpoint: sisterAppEndpoint,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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

    // Get students to sync (including email for auto-linking on Scholar)
    let studentQuery = supabase
      .from('students')
      .select('id, first_name, last_name, email, class_id, classes(name)')
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

    // Fetch analysis_misconceptions which have structured data including standards and remedies
    const { data: analysisMisconceptions } = await supabase
      .from('analysis_misconceptions')
      .select('student_id, topic_name, misconception_text, severity, suggested_remedies, grade_history_id, grade_history(nys_standard, topic_name)')
      .in('student_id', studentIds)
      .eq('teacher_id', user.id);

    // Fetch worksheets for problem set names
    const { data: worksheets } = await supabase
      .from('worksheets')
      .select('id, title')
      .eq('teacher_id', user.id);

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

      // Extract misconceptions from attempt_misconceptions
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
                standard: null,
                problem_set: null,
                severity: null,
                suggested_remedies: null,
              });
            }
          }
        }
      }

      // Add misconceptions from analysis_misconceptions (has standards and remedies)
      const studentAnalysisMisconceptions = (analysisMisconceptions || []).filter(m => m.student_id === student.id);
      for (const am of studentAnalysisMisconceptions) {
        const gradeHistory = am.grade_history as any;
        const standard = gradeHistory?.nys_standard || null;
        
        // Find associated worksheet/problem set from grade history topic
        const topicName = am.topic_name;
        const associatedWorksheet = (worksheets || []).find(w => 
          w.title?.toLowerCase().includes(topicName?.toLowerCase() || '')
        );

        if (!misconceptionSet.has(am.misconception_text)) {
          misconceptionSet.add(am.misconception_text);
          misconceptions.push({
            name: am.misconception_text,
            description: am.misconception_text,
            confidence: null,
            topic_name: am.topic_name,
            standard: standard,
            problem_set: associatedWorksheet?.title || null,
            severity: am.severity,
            suggested_remedies: am.suggested_remedies,
          });
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
        student_email: student.email || null,  // Include email for auto-linking
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

    // Determine the endpoint - check if it ends with /sync-student or needs it appended
    let baseEndpoint = sisterAppEndpoint;
    const isSyncStudentEndpoint = sisterAppEndpoint.includes('/sync-student');
    
    // Track sync results
    const syncResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Try batch sync first to our own receiver, otherwise sync students individually
    const isOwnReceiver = sisterAppEndpoint.includes('receive-sister-app-data');
    
    if (isOwnReceiver) {
      // Use batch sync for our own receiver
      try {
        const response = await fetch(sisterAppEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': sisterAppApiKey,
          },
          body: JSON.stringify(batchPayload),
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          console.error('Batch sync failed:', response.status, responseText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Batch sync failed',
              details: responseText,
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
      } catch (fetchError) {
        console.error('Network error:', fetchError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Network error: ${fetchError instanceof Error ? fetchError.message : 'Connection failed'}`,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // For external Scholar API - sync students in parallel batches for speed
    // Use the dedicated /sync-student endpoint for bulk student syncing
    const BATCH_SIZE = 20; // Increased batch size for faster processing
    const syncStudentEndpoint = baseEndpoint.replace('/nycologic-webhook', '/sync-student');
    console.log(`Syncing to Scholar API at ${syncStudentEndpoint} - processing ${studentProfiles.length} students in batches of ${BATCH_SIZE}...`);
    
    // Build all payloads first
    const studentPayloads = studentProfiles.map(profile => ({
      profile,
      payload: {
        action: 'sync_student',
        student_id: profile.student_id,
        student_name: profile.student_name,
        student_email: profile.student_email,  // Email for auto-linking on Scholar signup
        class_id: profile.class_id,
        class_name: profile.class_name,
        teacher_id: user.id,
        teacher_name: teacherProfile?.full_name || null,
        overall_average: profile.overall_average,
        grades: profile.grades.slice(0, 20).map(g => ({
          topic: g.topic_name,
          score: g.grade,
          regents_score: g.regents_score,
          standard: g.nys_standard,
          justification: g.grade_justification,
          date: g.created_at,
        })),
        misconceptions: profile.misconceptions.map(m => ({
          name: m.name,
          description: m.description,
          topic: m.topic_name,
          confidence: m.confidence,
          standard: m.standard,
          problem_set: m.problem_set,
          severity: m.severity,
          suggested_remedies: m.suggested_remedies,
        })),
        weak_topics: profile.weak_topics,
        remediation_recommendations: profile.recommended_remediation,
        xp_potential: profile.xp_potential,
        coin_potential: profile.coin_potential,
        sync_timestamp: new Date().toISOString(),
      },
    }));

    // Log first payload for debugging
    if (studentPayloads.length > 0) {
      const samplePayload = studentPayloads[0].payload;
      console.log('Sample student payload being sent:', JSON.stringify({
        student_id: samplePayload.student_id,
        student_name: samplePayload.student_name,
        overall_average: samplePayload.overall_average,
        grades_count: samplePayload.grades?.length || 0,
        weak_topics_count: samplePayload.weak_topics?.length || 0,
        misconceptions_count: samplePayload.misconceptions?.length || 0,
        sample_grade: samplePayload.grades?.[0] || null,
        sample_weak_topic: samplePayload.weak_topics?.[0] || null,
      }));
    }

    // Process all batches in parallel using Promise.all for speed
    const allBatchPromises = [];
    for (let i = 0; i < studentPayloads.length; i += BATCH_SIZE) {
      const batch = studentPayloads.slice(i, i + BATCH_SIZE);
      
      const batchPromise = Promise.allSettled(
        batch.map(async ({ profile, payload }) => {
          const response = await fetch(syncStudentEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': sisterAppApiKey,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${profile.student_name}: ${response.status} - ${errorText.slice(0, 100)}`);
          }
          return profile.student_name;
        })
      );
      
      allBatchPromises.push(batchPromise);
    }

    // Wait for all batches concurrently
    const allBatchResults = await Promise.all(allBatchPromises);
    
    // Flatten and process all results
    for (const batchResults of allBatchResults) {
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          syncResults.successful++;
        } else {
          syncResults.failed++;
          if (syncResults.errors.length < 5) {
            syncResults.errors.push(result.reason?.message || 'Unknown error');
          }
          console.error('Sync failed:', result.reason?.message);
        }
      }
    }
    
    console.log(`All batches complete: ${syncResults.successful} synced, ${syncResults.failed} failed`);

    // Log the sync action with response for dashboard status display
    await supabase.from('sister_app_sync_log').insert({
      teacher_id: user.id,
      action: 'individual_sync',
      data: {
        ...batchPayload.summary,
        class_id,
        sync_results: syncResults,
        response: {
          success: syncResults.failed === 0 || syncResults.successful > 0,
          message: `Synced ${syncResults.successful} students`,
          processed: {
            students_synced: syncResults.successful,
            grades_received: (grades || []).length,
            misconceptions_tracked: totalMisconceptions,
          },
        },
      },
    });

    const allSucceeded = syncResults.failed === 0;
    const partialSuccess = syncResults.successful > 0 && syncResults.failed > 0;

    return new Response(
      JSON.stringify({ 
        success: allSucceeded || partialSuccess,
        synced_students: syncResults.successful,
        failed_students: syncResults.failed,
        synced_grades: (grades || []).length,
        misconceptions_synced: totalMisconceptions,
        weak_topics_synced: totalWeakTopics,
        errors: syncResults.errors.length > 0 ? syncResults.errors : undefined,
        message: allSucceeded 
          ? `Successfully synced ${syncResults.successful} students to Scholar`
          : partialSuccess
            ? `Synced ${syncResults.successful} students, ${syncResults.failed} failed`
            : `Failed to sync all ${syncResults.failed} students`,
      }),
      { 
        status: allSucceeded ? 200 : partialSuccess ? 207 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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
