import { useState, useEffect } from 'react';
import { AlertTriangle, Users, CheckCircle2, UserX, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface MissingSubmissionsAlertProps {
  classId: string;
  analyzedStudentIds: string[];
  analyzedStudentNames?: string[];
  assignmentName?: string;
}

type AbsenceReason = 'absent' | 'late' | 'exempt' | 'will_submit_later';

export function MissingSubmissionsAlert({
  classId,
  analyzedStudentIds,
  analyzedStudentNames = [],
  assignmentName = 'this assignment',
}: MissingSubmissionsAlertProps) {
  const [rosterStudents, setRosterStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [markedStudents, setMarkedStudents] = useState<Map<string, AbsenceReason>>(new Map());

  useEffect(() => {
    async function fetchRoster() {
      if (!classId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('last_name');

      if (!error && data) {
        setRosterStudents(data);
      }
      setIsLoading(false);
    }

    fetchRoster();
  }, [classId]);

  // Find students in roster who don't have analyzed work
  const missingStudents = rosterStudents.filter(student => {
    // Check by ID first
    if (analyzedStudentIds.includes(student.id)) return false;
    
    // Also check by name match for students who might have been manually entered
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    const nameMatch = analyzedStudentNames.some(name => 
      name?.toLowerCase().includes(fullName) || 
      fullName.includes(name?.toLowerCase() || '')
    );
    return !nameMatch;
  });

  // Students who are analyzed
  const analyzedStudents = rosterStudents.filter(student => 
    analyzedStudentIds.includes(student.id) ||
    analyzedStudentNames.some(name => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return name?.toLowerCase().includes(fullName) || fullName.includes(name?.toLowerCase() || '');
    })
  );

  // Unmarked missing students (not yet marked as absent/exempt/etc.)
  const unmarkedMissing = missingStudents.filter(s => !markedStudents.has(s.id));

  const handleMarkStudent = (studentId: string, reason: AbsenceReason) => {
    setMarkedStudents(prev => {
      const next = new Map(prev);
      if (next.get(studentId) === reason) {
        next.delete(studentId);
      } else {
        next.set(studentId, reason);
      }
      return next;
    });
  };

  const handleMarkAllAbsent = () => {
    setMarkedStudents(prev => {
      const next = new Map(prev);
      unmarkedMissing.forEach(student => {
        next.set(student.id, 'absent');
      });
      return next;
    });
    toast.success(`Marked ${unmarkedMissing.length} student(s) as absent`);
  };

  const getReasonLabel = (reason: AbsenceReason) => {
    switch (reason) {
      case 'absent': return 'Absent';
      case 'late': return 'Late Submission';
      case 'exempt': return 'Exempt';
      case 'will_submit_later': return 'Will Submit Later';
    }
  };

  const getReasonColor = (reason: AbsenceReason) => {
    switch (reason) {
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'exempt': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'will_submit_later': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
  };

  if (isLoading) return null;
  if (!classId || rosterStudents.length === 0) return null;

  const hasMissingStudents = missingStudents.length > 0;
  const allAccountedFor = unmarkedMissing.length === 0 && missingStudents.length > 0;

  return (
    <div className="space-y-3">
      {/* Main Alert */}
      <Alert 
        variant={hasMissingStudents && !allAccountedFor ? 'destructive' : 'default'}
        className={hasMissingStudents && !allAccountedFor 
          ? 'border-orange-300 bg-orange-50/80 dark:bg-orange-950/30' 
          : 'border-green-300 bg-green-50/80 dark:bg-green-950/30'
        }
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start gap-3">
            {hasMissingStudents && !allAccountedFor ? (
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            )}
            <div>
              <AlertTitle className={hasMissingStudents && !allAccountedFor 
                ? 'text-orange-800 dark:text-orange-300' 
                : 'text-green-800 dark:text-green-300'
              }>
                {hasMissingStudents && !allAccountedFor 
                  ? `${unmarkedMissing.length} Student(s) Missing from Analysis`
                  : allAccountedFor
                    ? 'All Students Accounted For'
                    : 'All Students Submitted'
                }
              </AlertTitle>
              <AlertDescription className="mt-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <strong>{analyzedStudents.length}</strong> analyzed
                  </span>
                  {hasMissingStudents && (
                    <>
                      <span className="flex items-center gap-1.5">
                        <UserX className="h-4 w-4 text-orange-600" />
                        <strong>{unmarkedMissing.length}</strong> unaccounted
                      </span>
                      {markedStudents.size > 0 && (
                        <span className="flex items-center gap-1.5">
                          <ClipboardCheck className="h-4 w-4 text-blue-600" />
                          <strong>{markedStudents.size}</strong> marked
                        </span>
                      )}
                    </>
                  )}
                  <span className="text-muted-foreground">
                    of {rosterStudents.length} in roster
                  </span>
                </div>
              </AlertDescription>
            </div>
          </div>
          
          {hasMissingStudents && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Review
                </>
              )}
            </Button>
          )}
        </div>
      </Alert>

      {/* Expanded Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <div className="rounded-lg border bg-card p-4 space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Attendance Check for {assignmentName}
              </h4>
              {unmarkedMissing.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAllAbsent}
                >
                  Mark All as Absent
                </Button>
              )}
            </div>

            {/* Missing Students List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {missingStudents.map(student => {
                  const markedReason = markedStudents.get(student.id);
                  return (
                    <div 
                      key={student.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        markedReason 
                          ? 'bg-muted/50' 
                          : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserX className={`h-4 w-4 ${markedReason ? 'text-muted-foreground' : 'text-orange-600'}`} />
                        <span className={markedReason ? 'text-muted-foreground' : 'font-medium'}>
                          {student.last_name}, {student.first_name}
                        </span>
                        {markedReason && (
                          <Badge className={getReasonColor(markedReason)}>
                            {getReasonLabel(markedReason)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Quick action buttons */}
                        <div className="flex gap-1">
                          <Button
                            variant={markedReason === 'absent' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleMarkStudent(student.id, 'absent')}
                          >
                            Absent
                          </Button>
                          <Button
                            variant={markedReason === 'late' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleMarkStudent(student.id, 'late')}
                          >
                            Late
                          </Button>
                          <Button
                            variant={markedReason === 'exempt' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleMarkStudent(student.id, 'exempt')}
                          >
                            Exempt
                          </Button>
                          <Button
                            variant={markedReason === 'will_submit_later' ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleMarkStudent(student.id, 'will_submit_later')}
                          >
                            Later
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Summary Footer */}
            {markedStudents.size > 0 && (
              <div className="pt-3 border-t">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="text-muted-foreground">Summary:</span>
                  {['absent', 'late', 'exempt', 'will_submit_later'].map(reason => {
                    const count = Array.from(markedStudents.values()).filter(r => r === reason).length;
                    if (count === 0) return null;
                    return (
                      <Badge key={reason} variant="secondary" className={getReasonColor(reason as AbsenceReason)}>
                        {count} {getReasonLabel(reason as AbsenceReason)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Analyzed Students Preview */}
            <div className="pt-3 border-t">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {analyzedStudents.length} Students Analyzed
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {analyzedStudents.map(student => (
                      <div 
                        key={student.id}
                        className="flex items-center gap-2 p-2 rounded bg-green-50/50 dark:bg-green-950/20 text-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span>{student.last_name}, {student.first_name}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
