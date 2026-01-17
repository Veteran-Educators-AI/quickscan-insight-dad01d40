import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  User,
  BookOpen,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentReportDialog } from '@/components/reports/StudentReportDialog';
import { BatchRemediationEmailDialog } from '@/components/reports/BatchRemediationEmailDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface StrugglingStudent {
  id: string;
  firstName: string;
  lastName: string;
  classId: string;
  className: string;
  averageGrade: number;
  weakTopicCount: number;
  trend: 'improving' | 'stable' | 'declining';
  lastAssessmentDate: string | null;
  email?: string;
  parentEmail?: string;
  weakTopics?: string[];
}

interface StudentsNeedingHelpWidgetProps {
  className?: string;
  limit?: number;
}

const LEVEL_THRESHOLDS = { A: 90, B: 80, C: 70, D: 60, E: 50, F: 0 };

function scoreToLevel(score: number): string {
  if (score >= LEVEL_THRESHOLDS.A) return 'A';
  if (score >= LEVEL_THRESHOLDS.B) return 'B';
  if (score >= LEVEL_THRESHOLDS.C) return 'C';
  if (score >= LEVEL_THRESHOLDS.D) return 'D';
  if (score >= LEVEL_THRESHOLDS.E) return 'E';
  return 'F';
}

function calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';
  const midpoint = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

export function StudentsNeedingHelpWidget({ className, limit = 5 }: StudentsNeedingHelpWidgetProps) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [showBatchEmailDialog, setShowBatchEmailDialog] = useState(false);

  const { data: strugglingStudents, isLoading } = useQuery({
    queryKey: ['struggling-students', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];

      // 1. Fetch all classes for this teacher
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);

      if (classError) throw classError;
      if (!classes?.length) return [];

      const classMap = new Map(classes.map(c => [c.id, c.name]));
      const classIds = classes.map(c => c.id);

      // 2. Fetch all students in these classes with email info
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id, email, parent_email')
        .in('class_id', classIds);

      if (studentsError) throw studentsError;
      if (!students?.length) return [];

      const studentIds = students.map(s => s.id);

      // 3. Fetch grade history for these students
      const { data: grades, error: gradesError } = await supabase
        .from('grade_history')
        .select('student_id, topic_name, grade, raw_score_earned, raw_score_possible, created_at')
        .in('student_id', studentIds)
        .order('created_at', { ascending: true });

      if (gradesError) throw gradesError;

      // 4. Process each student
      const studentProfiles: StrugglingStudent[] = students.map(student => {
        const studentGrades = (grades || []).filter(g => g.student_id === student.id);
        
        // Calculate scores
        const scores = studentGrades.map(g => 
          g.raw_score_possible && g.raw_score_possible > 0
            ? (Number(g.raw_score_earned) / Number(g.raw_score_possible)) * 100
            : g.grade
        );

        const averageGrade = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 70;

        // Count weak topics (< 70%)
        const topicScores: Record<string, number[]> = {};
        studentGrades.forEach(g => {
          const score = g.raw_score_possible && g.raw_score_possible > 0
            ? (Number(g.raw_score_earned) / Number(g.raw_score_possible)) * 100
            : g.grade;
          if (!topicScores[g.topic_name]) topicScores[g.topic_name] = [];
          topicScores[g.topic_name].push(score);
        });

        const weakTopicsEntries = Object.entries(topicScores).filter(([_, topicScoreList]) => {
          const avg = topicScoreList.reduce((a, b) => a + b, 0) / topicScoreList.length;
          return avg < 70;
        });
        const weakTopicCount = weakTopicsEntries.length;
        const weakTopics = weakTopicsEntries.map(([name]) => name);

        return {
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          classId: student.class_id,
          className: classMap.get(student.class_id) || 'Unknown Class',
          averageGrade,
          weakTopicCount,
          weakTopics,
          trend: calculateTrend(scores),
          lastAssessmentDate: studentGrades.length > 0
            ? studentGrades[studentGrades.length - 1].created_at
            : null,
          email: student.email || undefined,
          parentEmail: student.parent_email || undefined,
        };
      });

      // 5. Filter to struggling students and sort by lowest grade
      return studentProfiles
        .filter(s => s.averageGrade < 70 || s.weakTopicCount > 0)
        .sort((a, b) => a.averageGrade - b.averageGrade)
        .slice(0, limit);
    },
    enabled: !!user,
  });

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3.5 w-3.5 text-success" />;
      case 'declining':
        return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getLevelBadgeColor = (grade: number) => {
    const level = scoreToLevel(grade);
    switch (level) {
      case 'A': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'B': return 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20';
      case 'C': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'D': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'E': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default: return 'bg-red-700/10 text-red-800 dark:text-red-300 border-red-700/20';
    }
  };

  return (
    <>
      <Card className={cn("animate-slide-up", className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Students Needing Help</CardTitle>
              <CardDescription>Top {limit} struggling students across all classes</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {strugglingStudents && strugglingStudents.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBatchEmailDialog(true);
                }}
                className="gap-1"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Email All</span>
              </Button>
            )}
            <Link to="/reports">
              <Button variant="ghost" size="sm">
                All Reports <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : !strugglingStudents?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No struggling students found</p>
              <p className="text-sm">All students are performing at or above 70%</p>
            </div>
          ) : (
            <div className="space-y-2">
              {strugglingStudents.map((student, index) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent({ 
                    id: student.id, 
                    name: `${student.firstName} ${student.lastName}` 
                  })}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  {/* Rank indicator */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm font-semibold">
                    {index + 1}
                  </div>

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {student.lastName}, {student.firstName}
                      </p>
                      {getTrendIcon(student.trend)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{student.className}</span>
                      {student.weakTopicCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {student.weakTopicCount} weak {student.weakTopicCount === 1 ? 'topic' : 'topics'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Grade badge */}
                  <Badge 
                    variant="outline" 
                    className={cn("shrink-0 font-semibold", getLevelBadgeColor(student.averageGrade))}
                  >
                    {student.averageGrade}%
                  </Badge>

                  {/* Arrow on hover */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Report Dialog */}
      {selectedStudent && (
        <StudentReportDialog
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
        />
      )}

      {/* Batch Remediation Email Dialog */}
      {strugglingStudents && strugglingStudents.length > 0 && (
        <BatchRemediationEmailDialog
          open={showBatchEmailDialog}
          onOpenChange={setShowBatchEmailDialog}
          students={strugglingStudents}
        />
      )}
    </>
  );
}
