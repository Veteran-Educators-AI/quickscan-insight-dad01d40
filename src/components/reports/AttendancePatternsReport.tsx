import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  UserX, 
  Clock, 
  ShieldCheck, 
  FileQuestion,
  TrendingDown,
  Users,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { useStudentNames } from '@/lib/StudentNameContext';

interface AttendancePatternsReportProps {
  classId?: string;
}

type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  assignment_name: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  students: {
    id: string;
    first_name: string;
    last_name: string;
  };
  classes: {
    id: string;
    name: string;
  };
};

type StudentPattern = {
  studentId: string;
  studentName: string;
  className: string;
  classId: string;
  totalMissing: number;
  absentCount: number;
  lateCount: number;
  exemptCount: number;
  willSubmitCount: number;
  assignments: Array<{
    name: string;
    status: string;
    date: string;
  }>;
  riskLevel: 'high' | 'medium' | 'low';
};

const STATUS_CONFIG = {
  absent: { label: 'Absent', icon: UserX, color: 'bg-destructive/10 text-destructive' },
  late: { label: 'Late', icon: Clock, color: 'bg-amber-500/10 text-amber-600' },
  exempt: { label: 'Exempt', icon: ShieldCheck, color: 'bg-blue-500/10 text-blue-600' },
  will_submit_later: { label: 'Will Submit', icon: FileQuestion, color: 'bg-muted text-muted-foreground' },
};

export function AttendancePatternsReport({ classId }: AttendancePatternsReportProps) {
  const { user } = useAuth();
  const { getDisplayName } = useStudentNames();
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [riskFilter, setRiskFilter] = useState<string>('all');

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['attendance-patterns', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('assignment_attendance')
        .select(`
          id,
          student_id,
          class_id,
          assignment_name,
          status,
          notes,
          created_at,
          updated_at,
          students!inner(id, first_name, last_name),
          classes!inner(id, name)
        `)
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AttendanceRecord[];
    },
    enabled: !!user,
  });

  const studentPatterns = useMemo(() => {
    if (!attendanceRecords?.length) return [];

    const byStudent: Record<string, StudentPattern> = {};

    attendanceRecords.forEach(record => {
      const studentId = record.student_id;
      const student = record.students;
      const cls = record.classes;

      if (!byStudent[studentId]) {
        byStudent[studentId] = {
          studentId,
          studentName: getDisplayName(studentId, student.first_name, student.last_name),
          className: cls.name,
          classId: cls.id,
          totalMissing: 0,
          absentCount: 0,
          lateCount: 0,
          exemptCount: 0,
          willSubmitCount: 0,
          assignments: [],
          riskLevel: 'low',
        };
      }

      byStudent[studentId].totalMissing++;
      
      switch (record.status) {
        case 'absent':
          byStudent[studentId].absentCount++;
          break;
        case 'late':
          byStudent[studentId].lateCount++;
          break;
        case 'exempt':
          byStudent[studentId].exemptCount++;
          break;
        case 'will_submit_later':
          byStudent[studentId].willSubmitCount++;
          break;
      }

      byStudent[studentId].assignments.push({
        name: record.assignment_name,
        status: record.status,
        date: format(new Date(record.created_at), 'MMM d, yyyy'),
      });
    });

    // Calculate risk levels
    return Object.values(byStudent)
      .map(student => {
        // High risk: 3+ absences or 50%+ missing rate
        // Medium risk: 2 absences or 3+ late
        // Low risk: everything else
        if (student.absentCount >= 3 || student.totalMissing >= 5) {
          student.riskLevel = 'high';
        } else if (student.absentCount >= 2 || student.lateCount >= 3) {
          student.riskLevel = 'medium';
        } else {
          student.riskLevel = 'low';
        }
        return student;
      })
      .sort((a, b) => {
        // Sort by risk level first, then by total missing
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return b.totalMissing - a.totalMissing;
      });
  }, [attendanceRecords, getDisplayName]);

  const filteredPatterns = useMemo(() => {
    if (riskFilter === 'all') return studentPatterns;
    return studentPatterns.filter(s => s.riskLevel === riskFilter);
  }, [studentPatterns, riskFilter]);

  const stats = useMemo(() => {
    const high = studentPatterns.filter(s => s.riskLevel === 'high').length;
    const medium = studentPatterns.filter(s => s.riskLevel === 'medium').length;
    const low = studentPatterns.filter(s => s.riskLevel === 'low').length;
    const totalRecords = attendanceRecords?.length || 0;
    const uniqueAssignments = new Set(attendanceRecords?.map(r => r.assignment_name) || []).size;
    
    return { high, medium, low, totalRecords, uniqueAssignments };
  }, [studentPatterns, attendanceRecords]);

  const toggleExpanded = (studentId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><TrendingDown className="h-3 w-3" />Medium Risk</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">Low Risk</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Attendance Patterns
            </CardTitle>
            <CardDescription>
              Track students with missing submissions across assignments
            </CardDescription>
          </div>
          
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.high}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">High Risk Students</p>
          </div>
          
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.medium}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Medium Risk</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.low}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Low Risk</p>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-primary">
              <FileQuestion className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.totalRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Records</p>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-600">
              <CalendarDays className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.uniqueAssignments}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Assignments Tracked</p>
          </div>
        </div>

        {/* Student Patterns Table */}
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No attendance records found</p>
            <p className="text-sm">Mark students as absent, late, or exempt when scanning to track patterns</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Exempt</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatterns.map((student) => (
                  <Collapsible 
                    key={student.studentId} 
                    open={expandedStudents.has(student.studentId)}
                    onOpenChange={() => toggleExpanded(student.studentId)}
                    asChild
                  >
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            {expandedStudents.has(student.studentId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-muted-foreground">{student.className}</TableCell>
                          <TableCell className="text-center">
                            {student.absentCount > 0 && (
                              <Badge variant="destructive" className="min-w-8 justify-center">
                                {student.absentCount}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.lateCount > 0 && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 min-w-8 justify-center">
                                {student.lateCount}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.exemptCount > 0 && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 min-w-8 justify-center">
                                {student.exemptCount}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.willSubmitCount > 0 && (
                              <Badge variant="secondary" className="min-w-8 justify-center">
                                {student.willSubmitCount}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getRiskBadge(student.riskLevel)}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={8} className="p-0">
                            <div className="p-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground mb-3">Assignment History</p>
                              <div className="flex flex-wrap gap-2">
                                {student.assignments.map((assignment, idx) => {
                                  const config = STATUS_CONFIG[assignment.status as keyof typeof STATUS_CONFIG];
                                  const Icon = config?.icon || FileQuestion;
                                  return (
                                    <div 
                                      key={idx}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${config?.color || 'bg-muted'}`}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                      <span className="font-medium">{assignment.name}</span>
                                      <span className="text-xs opacity-70">({assignment.date})</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
