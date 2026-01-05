import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Users, ChevronDown, ChevronRight, Target, BookOpen, Sparkles, AlertTriangle, ClipboardPlus, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { PrintRemediationDialog } from '@/components/print/PrintRemediationDialog';
import type { StudentMastery } from './MasteryHeatMap';

interface Topic {
  id: string;
  name: string;
}

interface DifferentiationGroupingProps {
  students: StudentMastery[];
  topics: Topic[];
}

interface StudentGroup {
  level: 'advanced' | 'proficient' | 'developing' | 'needs-support';
  label: string;
  description: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  students: StudentMastery[];
  weakTopics: { topicId: string; topicName: string; avgScore: number }[];
  suggestedQuestions: { topic: string; difficulty: string; count: number }[];
}

const GROUP_DEFINITIONS = [
  { 
    level: 'advanced' as const, 
    label: 'Advanced', 
    description: 'Ready for enrichment',
    minScore: 85, 
    maxScore: 100,
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  { 
    level: 'proficient' as const, 
    label: 'Proficient', 
    description: 'Meeting expectations',
    minScore: 70, 
    maxScore: 84,
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  { 
    level: 'developing' as const, 
    label: 'Developing', 
    description: 'Making progress',
    minScore: 55, 
    maxScore: 69,
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  { 
    level: 'needs-support' as const, 
    label: 'Needs Support', 
    description: 'Requires intervention',
    minScore: 0, 
    maxScore: 54,
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
];

function getLowerDifficultyLabel(level: StudentGroup['level']): string {
  switch (level) {
    case 'advanced': return 'On-level practice';
    case 'proficient': return 'Reinforcement practice';
    case 'developing': return 'Foundational practice';
    case 'needs-support': return 'Scaffolded practice';
    default: return 'Practice';
  }
}

export function DifferentiationGrouping({ students, topics }: DifferentiationGroupingProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['needs-support', 'developing']));
  const [creatingAssessment, setCreatingAssessment] = useState<string | null>(null);
  const [printDialogGroup, setPrintDialogGroup] = useState<StudentGroup | null>(null);

  const groups = useMemo(() => {
    const result: StudentGroup[] = GROUP_DEFINITIONS.map(def => ({
      ...def,
      students: [],
      weakTopics: [],
      suggestedQuestions: [],
    }));

    // Group students by performance level
    students.forEach(student => {
      if (student.overallMastery === 0) return; // Skip students with no data
      
      const group = result.find(g => 
        student.overallMastery >= g.minScore && student.overallMastery <= g.maxScore
      );
      if (group) {
        group.students.push(student);
      }
    });

    // For each group, find weak topics and suggest questions
    result.forEach(group => {
      if (group.students.length === 0) return;

      // Aggregate topic scores across all students in the group
      const topicScores: Record<string, { total: number; count: number; attempts: number }> = {};
      
      group.students.forEach(student => {
        student.topics.forEach(topic => {
          if (topic.totalAttempts > 0) {
            if (!topicScores[topic.topicId]) {
              topicScores[topic.topicId] = { total: 0, count: 0, attempts: 0 };
            }
            topicScores[topic.topicId].total += topic.avgScore;
            topicScores[topic.topicId].count += 1;
            topicScores[topic.topicId].attempts += topic.totalAttempts;
          }
        });
      });

      // Find topics where this group struggles (below their group's midpoint)
      const groupMidpoint = (group.minScore + group.maxScore) / 2;
      const weakTopics = Object.entries(topicScores)
        .map(([topicId, data]) => ({
          topicId,
          topicName: topics.find(t => t.id === topicId)?.name || 'Unknown',
          avgScore: Math.round(data.total / data.count),
        }))
        .filter(t => t.avgScore < groupMidpoint)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 5); // Top 5 weak topics

      group.weakTopics = weakTopics;

      // Generate suggested questions based on weak topics
      group.suggestedQuestions = weakTopics.slice(0, 5).map((topic, idx) => ({
        topic: topic.topicName,
        difficulty: getLowerDifficultyLabel(group.level),
        count: Math.min(5 - idx, 5), // Vary count to stay under 5 total
      }));

      // Ensure total questions don't exceed 5
      let totalQuestions = 0;
      group.suggestedQuestions = group.suggestedQuestions.map(q => {
        const remaining = 5 - totalQuestions;
        const count = Math.min(q.count, remaining);
        totalQuestions += count;
        return { ...q, count };
      }).filter(q => q.count > 0);
    });

    return result;
  }, [students, topics]);

  const toggleGroup = (level: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const createRemediationAssessment = async (group: StudentGroup) => {
    if (!user) {
      toast.error('You must be logged in to create assessments');
      return;
    }

    if (group.weakTopics.length === 0) {
      toast.error('No weak topics identified for this group');
      return;
    }

    setCreatingAssessment(group.level);

    try {
      // Get topic IDs for weak topics
      const weakTopicIds = group.weakTopics.map(t => t.topicId);

      // Find existing questions that match these topics (prefer lower difficulty)
      const { data: questionTopics, error: qtError } = await supabase
        .from('question_topics')
        .select(`
          question_id,
          topic_id,
          questions!inner(id, prompt_text, difficulty, teacher_id)
        `)
        .in('topic_id', weakTopicIds)
        .eq('questions.teacher_id', user.id);

      if (qtError) throw qtError;

      // Get unique questions, sorted by difficulty (lower first for remediation)
      const questionMap = new Map<string, { id: string; difficulty: number; topicId: string }>();
      questionTopics?.forEach(qt => {
        const q = qt.questions as any;
        if (q && !questionMap.has(q.id)) {
          questionMap.set(q.id, { 
            id: q.id, 
            difficulty: q.difficulty || 1,
            topicId: qt.topic_id 
          });
        }
      });

      // Sort by difficulty and take up to 5 questions
      const sortedQuestions = Array.from(questionMap.values())
        .sort((a, b) => a.difficulty - b.difficulty)
        .slice(0, 5);

      // Create the assessment
      const assessmentName = `Remediation - ${group.label} Group`;
      const topicNames = group.weakTopics.slice(0, 3).map(t => t.topicName).join(', ');
      const instructions = `This remediation assessment targets the following areas for improvement: ${topicNames}. Students in this group scored between ${group.minScore}-${group.maxScore}% overall.`;

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          name: assessmentName,
          instructions,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Link questions to the assessment if we found any
      if (sortedQuestions.length > 0) {
        const assessmentQuestions = sortedQuestions.map((q, idx) => ({
          assessment_id: assessment.id,
          question_id: q.id,
          sort_order: idx,
        }));

        const { error: aqError } = await supabase
          .from('assessment_questions')
          .insert(assessmentQuestions);

        if (aqError) throw aqError;

        toast.success(`Created "${assessmentName}" with ${sortedQuestions.length} question${sortedQuestions.length !== 1 ? 's' : ''}`);
      } else {
        toast.success(`Created "${assessmentName}" - add questions from your question bank`, {
          description: 'No existing questions found for these topics.',
        });
      }

      // Navigate to assessments page
      navigate('/assessments');

    } catch (error) {
      console.error('Error creating remediation assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setCreatingAssessment(null);
    }
  };

  const studentsWithData = students.filter(s => s.overallMastery > 0);

  if (studentsWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Differentiation
          </CardTitle>
          <CardDescription>Student grouping based on performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No student performance data available yet.</p>
            <p className="text-sm">Scan student work to see grouping suggestions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Differentiation
        </CardTitle>
        <CardDescription>
          Students grouped by performance level with targeted standards for review
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grouping Section */}
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Grouping
          </h3>
          
          {groups.map(group => (
            <Collapsible 
              key={group.level} 
              open={expandedGroups.has(group.level)}
              onOpenChange={() => toggleGroup(group.level)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-between p-4 h-auto ${group.bgColor}`}
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.level) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div className="text-left">
                      <span className={`font-medium ${group.color}`}>{group.label}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        ({group.minScore}-{group.maxScore}%)
                      </span>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="border-l-2 ml-6 pl-4 mt-2 space-y-4">
                {group.students.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No students in this group</p>
                ) : (
                  <>
                    {/* Students in this group */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Students
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {group.students.map(student => (
                          <Badge key={student.studentId} variant="outline" className="text-xs">
                            {student.studentName}
                            <span className="ml-1 opacity-70">({student.overallMastery}%)</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Weak topics to review */}
                    {group.weakTopics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <BookOpen className="h-3 w-3" />
                          Standards to Review
                        </h4>
                        <div className="space-y-1">
                          {group.weakTopics.map(topic => (
                            <div 
                              key={topic.topicId}
                              className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5"
                            >
                              <span>{topic.topicName}</span>
                              <Badge 
                                variant={topic.avgScore < 50 ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {topic.avgScore}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested remediation questions */}
                    {group.suggestedQuestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="h-3 w-3" />
                          Suggested Remediation (max 5 questions)
                        </h4>
                        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                          {group.suggestedQuestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium">{suggestion.topic}</span>
                                <span className="text-muted-foreground ml-2">
                                  • {suggestion.difficulty}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.count} Q{suggestion.count !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          ))}
                          <div className="pt-2 border-t mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              💡 Assign lower-level versions of these standards as practice.
                            </p>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPrintDialogGroup(group)}
                                className="shrink-0"
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Print
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => createRemediationAssessment(group)}
                                disabled={creatingAssessment === group.level}
                                className="shrink-0"
                              >
                                {creatingAssessment === group.level ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <ClipboardPlus className="h-3 w-3 mr-1" />
                                )}
                                Create Assessment
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>

      {/* Print Remediation Dialog */}
      {printDialogGroup && (
        <PrintRemediationDialog
          open={!!printDialogGroup}
          onOpenChange={(open) => !open && setPrintDialogGroup(null)}
          groupLabel={printDialogGroup.label}
          students={printDialogGroup.students}
          weakTopics={printDialogGroup.weakTopics}
        />
      )}
    </Card>
  );
}
