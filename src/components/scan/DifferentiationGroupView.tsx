import { useState } from 'react';
import { Users, TrendingUp, TrendingDown, Target, Send, BookOpen, Loader2, CheckCircle, ChevronDown, ChevronUp, Zap, Award, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BatchItem } from '@/hooks/useBatchAnalysis';
import { usePushToSisterApp } from '@/hooks/usePushToSisterApp';
import { toast } from 'sonner';

interface StudentGroup {
  level: 'struggling' | 'developing' | 'proficient';
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  students: BatchItem[];
  remediationType: string;
  xpReward: number;
  coinReward: number;
}

interface DifferentiationGroupViewProps {
  items: BatchItem[];
  classId?: string;
  getEffectiveGrade: (result: BatchItem['result']) => number;
}

export function DifferentiationGroupView({ items, classId, getEffectiveGrade }: DifferentiationGroupViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['struggling', 'developing']));
  const [pushingGroups, setPushingGroups] = useState<Set<string>>(new Set());
  const [pushedGroups, setPushedGroups] = useState<Set<string>>(new Set());
  const { pushToSisterApp } = usePushToSisterApp();

  const completedItems = items.filter(item => item.status === 'completed' && item.result);

  // Group students by performance level
  const strugglingStudents = completedItems.filter(item => {
    const grade = getEffectiveGrade(item.result);
    return grade < 60;
  });

  const developingStudents = completedItems.filter(item => {
    const grade = getEffectiveGrade(item.result);
    return grade >= 60 && grade < 80;
  });

  const proficientStudents = completedItems.filter(item => {
    const grade = getEffectiveGrade(item.result);
    return grade >= 80;
  });

  const groups: StudentGroup[] = [
    {
      level: 'struggling',
      label: 'Needs Support',
      description: 'Students scoring below 60% - require foundational skill building',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      students: strugglingStudents,
      remediationType: 'Basic Skills - Scaffolded Practice',
      xpReward: 25,
      coinReward: 15,
    },
    {
      level: 'developing',
      label: 'Approaching Mastery',
      description: 'Students scoring 60-79% - need targeted practice on specific concepts',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      icon: <Target className="h-5 w-5 text-amber-600" />,
      students: developingStudents,
      remediationType: 'Concept Reinforcement',
      xpReward: 35,
      coinReward: 20,
    },
    {
      level: 'proficient',
      label: 'Proficient',
      description: 'Students scoring 80%+ - ready for challenge problems and extensions',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      icon: <Award className="h-5 w-5 text-green-600" />,
      students: proficientStudents,
      remediationType: 'Challenge Extensions',
      xpReward: 50,
      coinReward: 30,
    },
  ];

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

  const handlePushGroup = async (group: StudentGroup) => {
    if (!classId) {
      toast.error('Class ID required to push to NYClogic Scholar AI');
      return;
    }

    if (group.students.length === 0) {
      toast.info(`No students in the ${group.label} group`);
      return;
    }

    setPushingGroups(prev => new Set([...prev, group.level]));
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of group.students) {
        if (!item.studentId) continue;

        const effectiveGrade = getEffectiveGrade(item.result);
        const topicName = item.result?.problemIdentified || 'General Practice';
        const misconceptions = item.result?.misconceptions || [];

        const difficulty = group.level === 'struggling' ? 'scaffolded' : 
                          group.level === 'developing' ? 'practice' : 'challenge';

        const result = await pushToSisterApp({
          class_id: classId,
          title: `${group.remediationType}: ${topicName}`,
          description: group.level === 'proficient' 
            ? `Challenge problems to extend understanding. Ready for advanced applications.`
            : `${group.remediationType}. Focus areas: ${misconceptions.slice(0, 2).join(', ') || 'General review'}`,
          student_id: item.studentId,
          student_name: item.studentName,
          topic_name: `${group.remediationType} - ${topicName}`,
          standard_code: item.result?.nysStandard || 'N/A',
          xp_reward: group.xpReward,
          coin_reward: group.coinReward,
          grade: effectiveGrade,
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Sent ${group.remediationType} to ${successCount} student(s)!`);
        setPushedGroups(prev => new Set([...prev, group.level]));
      } else if (successCount > 0) {
        toast.warning(`${successCount} sent, ${failCount} failed`);
      } else {
        toast.error(`Failed to send ${group.remediationType}`);
      }
    } catch (err) {
      console.error('Push group error:', err);
      toast.error('Failed to send to NYClogic Scholar AI');
    } finally {
      setPushingGroups(prev => {
        const next = new Set(prev);
        next.delete(group.level);
        return next;
      });
    }
  };

  // Get common misconceptions for a group
  const getGroupMisconceptions = (students: BatchItem[]) => {
    const misconceptionCounts: Record<string, number> = {};
    students.forEach(item => {
      item.result?.misconceptions?.forEach(m => {
        misconceptionCounts[m] = (misconceptionCounts[m] || 0) + 1;
      });
    });
    return Object.entries(misconceptionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m, count]) => ({ misconception: m, count }));
  };

  if (completedItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Differentiation Groups
          <Badge variant="secondary" className="ml-2">
            {completedItems.length} students
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Students grouped by performance level with targeted remediation options
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((group) => {
          const isPushing = pushingGroups.has(group.level);
          const isPushed = pushedGroups.has(group.level);
          const isExpanded = expandedGroups.has(group.level);
          const misconceptions = getGroupMisconceptions(group.students);

          return (
            <Collapsible
              key={group.level}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.level)}
            >
              <Card className={`${group.bgColor} ${group.borderColor} border`}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${group.bgColor} flex items-center justify-center border ${group.borderColor}`}>
                        {group.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${group.color}`}>{group.label}</h3>
                          <Badge variant="outline" className={group.color}>
                            {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {classId && group.students.length > 0 && (
                        <Button
                          size="sm"
                          variant={isPushed ? 'outline' : 'secondary'}
                          disabled={isPushing || isPushed}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePushGroup(group);
                          }}
                          className="text-xs"
                        >
                          {isPushed ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sent
                            </>
                          ) : isPushing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-1" />
                              Send {group.remediationType.split(' ')[0]}
                            </>
                          )}
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    {/* Student List */}
                    {group.students.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {group.students.map((item) => {
                          const grade = getEffectiveGrade(item.result);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-background/60 rounded-md border"
                            >
                              <span className="text-sm font-medium truncate">{item.studentName}</span>
                              <Badge variant="outline" className={`text-xs ${group.color}`}>
                                {grade}%
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-2">
                        No students in this group
                      </p>
                    )}

                    {/* Common Misconceptions for this group */}
                    {misconceptions.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Common focus areas for this group:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {misconceptions.map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {m.misconception} ({m.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remediation Details */}
                    <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-purple-500" />
                        +{group.xpReward} XP per student
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-amber-500" />
                        +{group.coinReward} coins per student
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
