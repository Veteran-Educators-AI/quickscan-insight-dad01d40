import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { usePushStudentData } from './usePushStudentData';
import { usePushToSisterApp } from './usePushToSisterApp';
import type { SyncStatus } from '@/components/scan/SyncStatusIndicator';

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  grade?: number;
  gradeJustification?: string;
  feedback: string;
  nysStandard?: string;
  regentsScore?: number;
  regentsScoreJustification?: string;
}

interface SaveAnalysisParams {
  studentId: string;
  studentName?: string;
  className?: string;
  questionId: string;
  imageUrl: string;
  result: AnalysisResult;
  pendingScanId?: string;
  topicName?: string;
  topicId?: string;
  classId?: string;
}

async function sendLowRegentsAlert(params: {
  studentId: string;
  studentName: string;
  regentsScore: number;
  grade: number;
  topicName: string;
  nysStandard?: string;
  teacherEmail: string;
  teacherName: string;
  threshold: number;
  feedback?: string;
  parentEmail?: string;
  sendToParent?: boolean;
}) {
  try {
    const response = await supabase.functions.invoke('send-low-regents-alert', {
      body: params,
    });
    if (response.error) {
      console.error('Failed to send low Regents alert:', response.error);
    } else {
      console.log('Low Regents alert sent successfully:', response.data);
    }
  } catch (error) {
    console.error('Error sending low Regents alert:', error);
  }
}

export function useSaveAnalysisResults() {
  const { user } = useAuth();
  const { pushData } = usePushStudentData();
  const { pushToSisterApp } = usePushToSisterApp();
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    sisterAppSync: 'idle',
    webhookSync: 'idle',
  });

  const resetSyncStatus = useCallback(() => {
    setSyncStatus({
      sisterAppSync: 'idle',
      webhookSync: 'idle',
    });
  }, []);

  const saveResults = async (params: SaveAnalysisParams): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return null;
    }

    setIsSaving(true);

    try {
      // Validate required fields
      if (!params.studentId) {
        toast.error('Student ID is required to save results');
        return null;
      }
      
      if (!params.questionId) {
        toast.error('Question ID is required to save results. Please select a question from your library.');
        return null;
      }

      // 1. Create attempt record
      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .insert({
          student_id: params.studentId,
          question_id: params.questionId,
          status: 'analyzed',
        })
        .select('id')
        .single();

      if (attemptError) {
        // Check for foreign key violation
        if (attemptError.code === '23503') {
          if (attemptError.message.includes('question_id')) {
            toast.error('Invalid question. Please select a valid question from your library.');
          } else if (attemptError.message.includes('student_id')) {
            toast.error('Invalid student. Please select a valid student.');
          } else {
            toast.error('Database constraint error: ' + attemptError.message);
          }
          return null;
        }
        throw attemptError;
      }

      // 2. Create attempt_image record
      const { error: imageError } = await supabase
        .from('attempt_images')
        .insert({
          attempt_id: attempt.id,
          image_url: params.imageUrl,
          ocr_text: params.result.ocrText,
        });

      if (imageError) throw imageError;

      // 3. Create score records for each rubric item
      const scoreInserts = params.result.rubricScores.map((rubricScore, index) => ({
        attempt_id: attempt.id,
        points_earned: rubricScore.score,
        notes: rubricScore.feedback,
        is_auto_scored: true,
        teacher_override: false,
      }));

      // Insert a summary score with total
      const { error: scoreError } = await supabase
        .from('scores')
        .insert({
          attempt_id: attempt.id,
          points_earned: params.result.totalScore.earned,
          notes: params.result.feedback,
          is_auto_scored: true,
          teacher_override: false,
        });

      if (scoreError) throw scoreError;

      // 4. Save grade history if we have grade info
      // Calculate grade: minimum 55, but only if no standards met
      // If they earned any points, minimum should be 60
      const hasAnyPoints = params.result.totalScore.earned > 0;
      const baseGrade = hasAnyPoints ? 60 : 55;
      const calculatedGrade = hasAnyPoints 
        ? Math.round(baseGrade + (params.result.totalScore.percentage / 100) * (100 - baseGrade))
        : 55;
      const grade = params.result.grade ?? calculatedGrade;
      
      // Ensure grade is never below 55
      const finalGrade = Math.max(55, Math.min(100, grade));
      
      if (params.topicName) {
        const { error: gradeHistoryError } = await supabase
          .from('grade_history')
          .insert({
            student_id: params.studentId,
            topic_id: params.topicId || null,
            topic_name: params.topicName,
            grade: finalGrade,
            grade_justification: params.result.gradeJustification || null,
            raw_score_earned: params.result.totalScore.earned,
            raw_score_possible: params.result.totalScore.possible,
            attempt_id: attempt.id,
            teacher_id: user.id,
            regents_score: params.result.regentsScore ?? null,
            nys_standard: params.result.nysStandard ?? null,
            regents_justification: params.result.regentsScoreJustification ?? null,
          });

        if (gradeHistoryError) {
          console.error('Error saving grade history:', gradeHistoryError);
          // Don't throw - grade history is secondary
        }

        // Check if we need to send a low Regents score alert
        if (params.result.regentsScore !== undefined && params.result.regentsScore !== null) {
          const { data: alertSettings } = await supabase
            .from('settings')
            .select('low_regents_alerts_enabled, low_regents_threshold, low_regents_parent_alerts_enabled')
            .eq('teacher_id', user.id)
            .single();

          const alertsEnabled = alertSettings?.low_regents_alerts_enabled ?? true;
          const threshold = alertSettings?.low_regents_threshold ?? 2;
          const parentAlertsEnabled = alertSettings?.low_regents_parent_alerts_enabled ?? true;

          if (alertsEnabled && params.result.regentsScore < threshold) {
            // Get teacher profile for email
            const { data: teacherProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', user.id)
              .single();

            // Get student's parent email if parent alerts are enabled
            let parentEmail: string | undefined;
            if (parentAlertsEnabled) {
              const { data: studentData } = await supabase
                .from('students')
                .select('parent_email')
                .eq('id', params.studentId)
                .single();
              
              parentEmail = studentData?.parent_email || undefined;
            }

            if (teacherProfile?.email) {
              // Send alert in background - don't await
              sendLowRegentsAlert({
                studentId: params.studentId,
                studentName: params.studentName || 'Unknown Student',
                regentsScore: params.result.regentsScore,
                grade: finalGrade,
                topicName: params.topicName,
                nysStandard: params.result.nysStandard,
                teacherEmail: teacherProfile.email,
                teacherName: teacherProfile.full_name || 'Teacher',
                threshold,
                feedback: params.result.feedback,
                parentEmail,
                sendToParent: parentAlertsEnabled && !!parentEmail,
              });
            }
          }
        }
      }

      // 5. Delete the pending scan if provided
      if (params.pendingScanId) {
        await supabase
          .from('pending_scans')
          .delete()
          .eq('id', params.pendingScanId);
      }

      // 6. Push data to webhook (generic webhook integration)
      // Check webhook settings
      const { data: webhookSettings } = await supabase
        .from('settings')
        .select('integration_webhook_enabled, integration_webhook_url')
        .eq('teacher_id', user.id)
        .single();

      if (webhookSettings?.integration_webhook_enabled && webhookSettings?.integration_webhook_url) {
        setSyncStatus(prev => ({ ...prev, webhookSync: 'syncing' }));
        try {
          await pushData({
            eventType: 'scan_analysis',
            studentId: params.studentId,
            studentName: params.studentName || 'Unknown Student',
            classId: params.classId,
            className: params.className,
            data: {
              attemptId: attempt.id,
              topicName: params.topicName,
              topicId: params.topicId,
              totalScore: params.result.totalScore,
              grade: finalGrade,
              gradeJustification: params.result.gradeJustification,
              misconceptions: params.result.misconceptions,
              rubricScores: params.result.rubricScores,
              feedback: params.result.feedback,
            },
          });
          setSyncStatus(prev => ({ ...prev, webhookSync: 'success' }));
        } catch (webhookError) {
          console.error('Webhook push error:', webhookError);
          setSyncStatus(prev => ({ 
            ...prev, 
            webhookSync: 'failed',
            webhookError: webhookError instanceof Error ? webhookError.message : 'Webhook failed'
          }));
        }
      } else {
        setSyncStatus(prev => ({ ...prev, webhookSync: 'disabled' }));
      }

      // 7. Push to sister app (automatic sync) - check settings first
      if (params.classId) {
        const { data: settings } = await supabase
          .from('settings')
          .select('sister_app_sync_enabled, sister_app_xp_multiplier, sister_app_coin_multiplier')
          .eq('teacher_id', user.id)
          .single();

        if (settings?.sister_app_sync_enabled) {
          setSyncStatus(prev => ({ ...prev, sisterAppSync: 'syncing' }));
          
          const xpMultiplier = settings.sister_app_xp_multiplier || 0.5;
          const coinMultiplier = settings.sister_app_coin_multiplier || 0.25;
          
          const sisterAppResult = await pushToSisterApp({
            class_id: params.classId,
            title: `Grade: ${params.topicName || 'Assessment'}`,
            description: `${params.studentName || 'Student'} scored ${finalGrade}% - ${params.result.feedback}`,
            standard_code: params.topicName || undefined,
            xp_reward: Math.round(finalGrade * xpMultiplier),
            coin_reward: Math.round(finalGrade * coinMultiplier),
            student_id: params.studentId,
            student_name: params.studentName,
            grade: finalGrade,
            topic_name: params.topicName,
          });

          if (sisterAppResult.success) {
            setSyncStatus(prev => ({ 
              ...prev, 
              sisterAppSync: 'success',
              lastSyncTime: new Date()
            }));
          } else {
            setSyncStatus(prev => ({ 
              ...prev, 
              sisterAppSync: 'failed',
              sisterAppError: sisterAppResult.error || 'Sync to Scholar AI failed'
            }));
          }
        } else {
          setSyncStatus(prev => ({ ...prev, sisterAppSync: 'disabled' }));
        }
      } else {
        setSyncStatus(prev => ({ ...prev, sisterAppSync: 'disabled' }));
      }

      return attempt.id;
    } catch (err) {
      console.error('Error saving analysis results:', err);
      toast.error('Failed to save analysis results');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const saveMultiQuestionResults = async (
    studentId: string,
    imageUrl: string,
    results: Record<string, AnalysisResult>,
    pendingScanId?: string
  ): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return false;
    }

    setIsSaving(true);

    try {
      const questionIds = Object.keys(results);
      
      for (const questionId of questionIds) {
        const result = results[questionId];
        
        // Create attempt record
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: studentId,
            question_id: questionId,
            status: 'analyzed',
          })
          .select('id')
          .single();

        if (attemptError) throw attemptError;

        // Create attempt_image record
        await supabase
          .from('attempt_images')
          .insert({
            attempt_id: attempt.id,
            image_url: imageUrl,
            ocr_text: result.ocrText,
          });

        // Create score record
        await supabase
          .from('scores')
          .insert({
            attempt_id: attempt.id,
            points_earned: result.totalScore.earned,
            notes: result.feedback,
            is_auto_scored: true,
            teacher_override: false,
          });
      }

      // Delete the pending scan if provided
      if (pendingScanId) {
        await supabase
          .from('pending_scans')
          .delete()
          .eq('id', pendingScanId);
      }

      toast.success(`Saved ${questionIds.length} question results to database`);
      return true;
    } catch (err) {
      console.error('Error saving multi-question results:', err);
      toast.error('Failed to save analysis results');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveResults,
    saveMultiQuestionResults,
    isSaving,
    syncStatus,
    resetSyncStatus,
  };
}
