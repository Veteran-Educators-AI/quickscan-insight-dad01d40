import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface StudentDataCoverage {
  studentId: string;
  assignmentsSubmitted: number; // Unique assignments (grouped by topic + date)
  totalDataPoints: number; // Total grade_history entries
  diagnosticCount: number;
  misconceptionCount: number;
}

interface UseStudentDataCoverageResult {
  coverage: Map<string, StudentDataCoverage>;
  isLoading: boolean;
  error: Error | null;
  totalAssignments: number;
  totalDataPoints: number;
}

export function useStudentDataCoverage(classId?: string): UseStudentDataCoverageResult {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-data-coverage', user?.id, classId],
    queryFn: async () => {
      if (!user || !classId) {
        return { coverage: new Map(), totalAssignments: 0, totalDataPoints: 0 };
      }

      // Get all students in the class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId);

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) {
        return { coverage: new Map(), totalAssignments: 0, totalDataPoints: 0 };
      }

      const studentIds = students.map(s => s.id);

      // Fetch grade history for these students
      const { data: gradeHistory, error: gradeError } = await supabase
        .from('grade_history')
        .select('id, student_id, topic_name, created_at')
        .in('student_id', studentIds);

      if (gradeError) throw gradeError;

      // Fetch diagnostic results
      const { data: diagnostics, error: diagError } = await supabase
        .from('diagnostic_results')
        .select('id, student_id')
        .in('student_id', studentIds);

      if (diagError) throw diagError;

      // Fetch misconceptions
      const { data: misconceptions, error: miscError } = await supabase
        .from('analysis_misconceptions')
        .select('id, student_id')
        .in('student_id', studentIds);

      if (miscError) throw miscError;

      // Build coverage map
      const coverageMap = new Map<string, StudentDataCoverage>();
      let totalAssignments = 0;
      let totalDataPoints = 0;

      // Initialize all students with zero counts
      for (const student of students) {
        coverageMap.set(student.id, {
          studentId: student.id,
          assignmentsSubmitted: 0,
          totalDataPoints: 0,
          diagnosticCount: 0,
          misconceptionCount: 0,
        });
      }

      // Count unique assignments per student (group by topic + date to treat multi-page as one)
      const studentAssignments = new Map<string, Set<string>>();
      
      for (const grade of (gradeHistory || [])) {
        const studentCoverage = coverageMap.get(grade.student_id);
        if (studentCoverage) {
          studentCoverage.totalDataPoints++;
          totalDataPoints++;

          // Create unique assignment key: topic + date (YYYY-MM-DD)
          const date = new Date(grade.created_at).toISOString().split('T')[0];
          const assignmentKey = `${grade.topic_name}|${date}`;
          
          if (!studentAssignments.has(grade.student_id)) {
            studentAssignments.set(grade.student_id, new Set());
          }
          studentAssignments.get(grade.student_id)!.add(assignmentKey);
        }
      }

      // Update assignment counts from unique sets
      for (const [studentId, assignments] of studentAssignments) {
        const studentCoverage = coverageMap.get(studentId);
        if (studentCoverage) {
          studentCoverage.assignmentsSubmitted = assignments.size;
          totalAssignments += assignments.size;
        }
      }

      // Count diagnostics per student
      for (const diag of (diagnostics || [])) {
        const studentCoverage = coverageMap.get(diag.student_id);
        if (studentCoverage) {
          studentCoverage.diagnosticCount++;
        }
      }

      // Count misconceptions per student
      for (const misc of (misconceptions || [])) {
        const studentCoverage = coverageMap.get(misc.student_id);
        if (studentCoverage) {
          studentCoverage.misconceptionCount++;
        }
      }

      return { coverage: coverageMap, totalAssignments, totalDataPoints };
    },
    enabled: !!user && !!classId,
  });

  return {
    coverage: data?.coverage || new Map(),
    isLoading,
    error: error as Error | null,
    totalAssignments: data?.totalAssignments || 0,
    totalDataPoints: data?.totalDataPoints || 0,
  };
}
