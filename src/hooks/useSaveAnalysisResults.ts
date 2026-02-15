import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { usePushStudentData } from './usePushStudentData';
import { usePushToSisterApp } from './usePushToSisterApp';
import { usePerformanceDropAlert } from './usePerformanceDropAlert';
import { useDuplicateWorkDetection } from './useDuplicateWorkDetection';
import { useFeatureTracking } from './useFeatureTracking';
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
  strengthsAnalysis?: string[];
  areasForImprovement?: string[];
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
  skipDuplicateCheck?: boolean; // Allow forcing save even if duplicate detected
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
  const { checkAndSendAlert: checkPerformanceDrop, getPreviousGrade } = usePerformanceDropAlert();
  const { checkForDuplicate } = useDuplicateWorkDetection();
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    sisterAppSync: 'idle',
    webhookSync: 'idle',
  });
  const { trackFeature } = useFeatureTracking();

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
      // Track feature usage
      trackFeature({
        featureName: 'Save Scan Results',
        category: 'scanning',
        action: 'save',
        metadata: { 
          hasTopicName: !!params.topicName,
          hasClassId: !!params.classId 
        }
      });
      // Validate required fields
      if (!params.studentId) {
        toast.error('Student ID is required to save results');
        setIsSaving(false);
        return null;
      }
      
      if (!params.questionId) {
        toast.error('Question ID is required to save results. Please select a question from your library.');
        setIsSaving(false);
        return null;
      }

      // Check for duplicate work unless explicitly skipped
      if (!params.skipDuplicateCheck) {
        const duplicateCheck = await checkForDuplicate(
          params.studentId,
          params.questionId,
          params.result.ocrText,
          params.imageUrl
        );

        if (duplicateCheck.isDuplicate) {
          const gradeInfo = duplicateCheck.existingGrade 
            ? ` (Grade: ${duplicateCheck.existingGrade}%)` 
            : '';
          const dateInfo = duplicateCheck.createdAt 
            ? ` on ${new Date(duplicateCheck.createdAt).toLocaleDateString()}` 
            : '';
          
          toast.warning(
            `This work has already been analyzed${dateInfo}${gradeInfo}. Skipping duplicate.`,
            {
              description: 'The same student work was detected in a previous scan.',
              duration: 5000,
            }
          );
          setIsSaving(false);
          return duplicateCheck.existingAttemptId || null;
        }
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
      const scoreInserts = params.result.rubricScores.map((rubricScore) => ({
        attempt_id: attempt.id,
        points_earned: rubricScore.score,
        notes: rubricScore.feedback,
        is_auto_scored: true,
        teacher_override: false,
      }));

      if (scoreInserts.length > 0) {
        const { error: rubricScoreError } = await supabase
          .from('scores')
          .insert(scoreInserts);

        if (rubricScoreError) {
          console.error('Error saving rubric scores:', rubricScoreError);
          // Don't throw - rubric item scores are supplemental
        }
      }

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
      // Grade is now computed by the backend decision tree — trust it directly
      const grade = params.result.grade ?? 0;
      
      // Trust the backend grade — do NOT inflate
      const finalGrade = Math.max(0, Math.min(100, grade));
      
      let resolvedTopicName = params.topicName;
      let resolvedTopicId = params.topicId;

      if (!resolvedTopicName || !resolvedTopicId) {
        const { data: questionTopic, error: questionTopicError } = await supabase
          .from('question_topics')
          .select('topic_id, topics(name)')
          .eq('question_id', params.questionId)
          .maybeSingle();

        if (questionTopicError) {
          console.error('Error fetching question topic:', questionTopicError);
        }

        const topicNameFromQuestion = (questionTopic as any)?.topics?.name;
        if (!resolvedTopicId && questionTopic?.topic_id) {
          resolvedTopicId = questionTopic.topic_id;
        }
        if (!resolvedTopicName && topicNameFromQuestion) {
          resolvedTopicName = topicNameFromQuestion;
        }
      }

      if (!resolvedTopicName && params.result.problemIdentified) {
        resolvedTopicName = params.result.problemIdentified.trim();
      }

      if (!resolvedTopicName) {
        resolvedTopicName = 'General Assessment';
      }

      if (resolvedTopicName) {
        const { data: gradeHistoryData, error: gradeHistoryError } = await supabase
          .from('grade_history')
          .insert({
            student_id: params.studentId,
            topic_id: resolvedTopicId || null,
            topic_name: resolvedTopicName,
            grade: finalGrade,
            grade_justification: params.result.gradeJustification || null,
            raw_score_earned: params.result.totalScore.earned,
            raw_score_possible: params.result.totalScore.possible,
            attempt_id: attempt.id,
            teacher_id: user.id,
            regents_score: params.result.regentsScore ?? null,
            nys_standard: params.result.nysStandard ?? null,
            regents_justification: params.result.regentsScoreJustification ?? null,
          })
          .select('id')
          .single();

        if (gradeHistoryError) {
          console.error('Error saving grade history:', gradeHistoryError);
          // Don't throw - grade history is secondary
        }

        // 5. Save misconceptions to dedicated table if any were identified
        if (params.result.misconceptions && params.result.misconceptions.length > 0 && gradeHistoryData?.id) {
          const misconceptionRecords = params.result.misconceptions.map(misconception => {
            // Determine severity based on grade
            let severity = 'medium';
            if (finalGrade < 60) severity = 'high';
            else if (finalGrade >= 80) severity = 'low';

            // Match remediation suggestions
            const nameLower = misconception.toLowerCase();
            let suggestedRemedies: string[] = [];
            const remedyMap: Record<string, string[]> = {
              'sign error': ['Practice signed number operations with number lines', 'Use color coding for positive/negative values'],
              'order of operations': ['PEMDAS mnemonic practice', 'Stepwise problem breakdown exercises'],
              'fraction': ['Visual fraction models', 'Equivalent fraction practice'],
              'decimal': ['Place value reinforcement', 'Decimal-fraction conversion drills'],
              'variable': ['Substitution practice', 'Variable definition exercises'],
              'equation': ['Balance method practice', 'Inverse operation drills'],
              'graph': ['Coordinate plotting practice', 'Slope-intercept form exercises'],
              'exponent': ['Exponent rules flashcards', 'Scientific notation practice'],
              'arithmetic': ['Basic operations drills', 'Mental math exercises'],
              'calculation': ['Step-by-step verification practice', 'Check work backwards technique'],
            };
            
            for (const [key, remedies] of Object.entries(remedyMap)) {
              if (nameLower.includes(key)) {
                suggestedRemedies = remedies;
                break;
              }
            }
            if (suggestedRemedies.length === 0) {
              suggestedRemedies = ['Targeted practice problems', 'One-on-one tutoring session'];
            }

            return {
              student_id: params.studentId,
              teacher_id: user.id,
              attempt_id: attempt.id,
              grade_history_id: gradeHistoryData.id,
              topic_name: resolvedTopicName,
              misconception_text: misconception,
              suggested_remedies: suggestedRemedies,
              severity,
              grade_impact: 100 - finalGrade,
            };
          });

          const { error: misconceptionError } = await supabase
            .from('analysis_misconceptions')
            .insert(misconceptionRecords);

          if (misconceptionError) {
            console.error('Error saving misconceptions:', misconceptionError);
            // Don't throw - misconceptions are secondary
          } else {
            console.log(`Saved ${misconceptionRecords.length} misconceptions for student`);
          }
        }

        // Check for performance drop and send alert if significant
        if (resolvedTopicName && params.studentName) {
          const previousGrade = await getPreviousGrade(params.studentId, resolvedTopicName);
          if (previousGrade !== null && previousGrade > finalGrade) {
            // Get student's parent email for potential parent notification
            const { data: studentData } = await supabase
              .from('students')
              .select('parent_email')
              .eq('id', params.studentId)
              .single();

            // Get weak topics for remediation suggestions
            const { data: weakTopicsData } = await supabase
              .from('grade_history')
              .select('topic_name, grade')
              .eq('student_id', params.studentId)
              .lt('grade', 70)
              .order('created_at', { ascending: false })
              .limit(5);

            const weakTopics = weakTopicsData?.map(t => t.topic_name) || [];

            // Send performance drop alert (runs in background)
            checkPerformanceDrop({
              studentId: params.studentId,
              studentName: params.studentName,
              previousGrade,
              currentGrade: finalGrade,
              topicName: resolvedTopicName,
              nysStandard: params.result.nysStandard,
              parentEmail: studentData?.parent_email || undefined,
              weakTopics,
            }).then(result => {
              if (result.sent) {
                console.log('Performance drop alert sent:', result.reason);
              }
            }).catch(err => {
              console.error('Performance drop alert error:', err);
            });
          }
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
                topicName: resolvedTopicName,
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
              topicName: resolvedTopicName,
              topicId: resolvedTopicId,
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
      const { data: settings } = await supabase
        .from('settings')
        .select('sister_app_sync_enabled, sister_app_xp_multiplier, sister_app_coin_multiplier')
        .eq('teacher_id', user.id)
        .single();

      if (settings?.sister_app_sync_enabled) {
        setSyncStatus(prev => ({ ...prev, sisterAppSync: 'syncing' }));
        
        const xpMultiplier = settings.sister_app_xp_multiplier || 0.5;
        const coinMultiplier = settings.sister_app_coin_multiplier || 0.25;
        
        try {
          // Build remediation recommendations from misconceptions and topic
          const remediationRecommendations: string[] = [];
          
          // Add misconceptions as remediation topics
          if (params.result.misconceptions && params.result.misconceptions.length > 0) {
            params.result.misconceptions.forEach(misconception => {
              remediationRecommendations.push(`Address: ${misconception}`);
            });
          }
          
          // Add topic-based recommendations if grade is low
          if (finalGrade < 70 && resolvedTopicName) {
            remediationRecommendations.push(`Review ${resolvedTopicName} fundamentals`);
            if (params.result.nysStandard) {
              remediationRecommendations.push(`Practice ${params.result.nysStandard} concepts`);
            }
          }
          
          // Determine difficulty level based on grade
          let difficultyLevel = 'C'; // Default to medium
          if (finalGrade >= 85) difficultyLevel = 'E'; // Challenge level for high performers
          else if (finalGrade >= 70) difficultyLevel = 'C'; // Medium
          else if (finalGrade >= 50) difficultyLevel = 'B'; // Easier
          else difficultyLevel = 'A'; // Foundational
          
          // Push individual grade to sister app for immediate rewards
          const sisterAppResult = await pushToSisterApp({
            class_id: params.classId || '',
            source: 'scan_genius',  // Proper source identifier
            title: `Grade: ${resolvedTopicName || 'Assessment'}`,
            description: `${params.studentName || 'Student'} scored ${finalGrade}% - ${params.result.feedback}`,
            standard_code: params.result.nysStandard || resolvedTopicName || undefined,
            xp_reward: Math.round(finalGrade * xpMultiplier),
            coin_reward: Math.round(finalGrade * coinMultiplier),
            student_id: params.studentId,
            student_name: params.studentName,
            grade: finalGrade,
            topic_name: resolvedTopicName,
            // Include remediation data for Scholar app
            remediation_recommendations: remediationRecommendations,
            difficulty_level: difficultyLevel,
          });

          // Also sync full grade data to Scholar for student grade viewing
          const gradePayload = {
            action: 'grade_update',
            student_id: params.studentId,
            student_name: params.studentName || 'Unknown',
            topic_name: resolvedTopicName,
            grade: finalGrade,
            regents_score: params.result.regentsScore ?? null,
            nys_standard: params.result.nysStandard ?? null,
            grade_justification: params.result.gradeJustification ?? null,
            feedback: params.result.feedback,
            xp_reward: Math.round(finalGrade * xpMultiplier),
            coin_reward: Math.round(finalGrade * coinMultiplier),
            class_id: params.classId,
            attempt_id: attempt.id,
            timestamp: new Date().toISOString(),
          };

          // Log the sync for audit purposes (non-fatal if logging fails)
          try {
            await supabase.from('sister_app_sync_log').insert({
              teacher_id: user.id,
              student_id: params.studentId,
              action: 'auto_grade_sync',
              data: gradePayload,
            });
          } catch (logErr) {
            console.error('Non-fatal: Failed to log sync action:', logErr);
          }

          if (sisterAppResult.success) {
            setSyncStatus(prev => ({ 
              ...prev, 
              sisterAppSync: 'success',
              lastSyncTime: new Date()
            }));
            console.log('Grade synced to Scholar AI:', {
              student: params.studentName,
              grade: finalGrade,
              topic: resolvedTopicName,
            });
          } else {
            setSyncStatus(prev => ({ 
              ...prev, 
              sisterAppSync: 'failed',
              sisterAppError: sisterAppResult.error || 'Sync to Scholar AI failed'
            }));
          }
        } catch (syncError) {
          console.error('Scholar sync error:', syncError);
          setSyncStatus(prev => ({ 
            ...prev, 
            sisterAppSync: 'failed',
            sisterAppError: syncError instanceof Error ? syncError.message : 'Sync failed'
          }));
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
