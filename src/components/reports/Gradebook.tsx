import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  BookOpen, 
  Download, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp,
  ArrowUpDown,
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useStudentNames } from '@/lib/StudentNameContext';
import { toast } from 'sonner';

interface GradeEntry {
  id: string;
  student_id: string;
  topic_name: string;
  grade: number;
  grade_justification: string | null;
  raw_score_earned: number | null;
  raw_score_possible: number | null;
  regents_score: number | null;
  regents_justification: string | null;
  nys_standard: string | null;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
    class_id: string;
  };
}

interface GradebookProps {
  classId?: string;
}

type SortField = 'student' | 'topic' | 'grade' | 'regents' | 'date';
type SortDirection = 'asc' | 'desc';

export function Gradebook({ classId }: GradebookProps) {
  const { user } = useAuth();
  const { getDisplayName } = useStudentNames();
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch grade history
  const { data: grades, isLoading, refetch } = useQuery({
    queryKey: ['gradebook', user?.id, classId],
    queryFn: async () => {
      let query = supabase
        .from('grade_history')
        .select(`
          *,
          student:students(first_name, last_name, class_id)
        `)
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (classId) {
        // Filter by class via student relationship
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId);
        
        if (classStudents && classStudents.length > 0) {
          const studentIds = classStudents.map(s => s.id);
          query = query.in('student_id', studentIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GradeEntry[];
    },
    enabled: !!user,
  });

  // Get unique topics for filter
  const uniqueTopics = useMemo(() => {
    if (!grades) return [];
    const topics = [...new Set(grades.map(g => g.topic_name))];
    return topics.sort();
  }, [grades]);

  // Filter and sort grades
  const filteredGrades = useMemo(() => {
    if (!grades) return [];

    let filtered = grades;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => {
        const studentName = g.student 
          ? `${g.student.first_name} ${g.student.last_name}`.toLowerCase()
          : '';
        return (
          studentName.includes(term) ||
          g.topic_name.toLowerCase().includes(term) ||
          g.nys_standard?.toLowerCase().includes(term)
        );
      });
    }

    // Topic filter
    if (topicFilter !== 'all') {
      filtered = filtered.filter(g => g.topic_name === topicFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'student':
          const nameA = a.student ? `${a.student.last_name} ${a.student.first_name}` : '';
          const nameB = b.student ? `${b.student.last_name} ${b.student.first_name}` : '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'topic':
          comparison = a.topic_name.localeCompare(b.topic_name);
          break;
        case 'grade':
          comparison = a.grade - b.grade;
          break;
        case 'regents':
          comparison = (a.regents_score || 0) - (b.regents_score || 0);
          break;
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [grades, searchTerm, topicFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('grade_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Grade entry deleted');
      refetch();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete grade entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (!filteredGrades.length) return;

    const headers = ['Student', 'Topic', 'Grade', 'Regents Score', 'Standard', 'Date', 'Justification'];
    const rows = filteredGrades.map(g => [
      g.student ? `${g.student.first_name} ${g.student.last_name}` : 'Unknown',
      g.topic_name,
      g.grade,
      g.regents_score || '',
      g.nys_standard || '',
      format(new Date(g.created_at), 'yyyy-MM-dd HH:mm'),
      g.grade_justification || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Gradebook exported!');
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return 'text-green-600 dark:text-green-400';
    if (grade >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRegentsColor = (score: number) => {
    if (score >= 5) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  // Summary stats
  const stats = useMemo(() => {
    if (!filteredGrades.length) return null;
    const avgGrade = filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length;
    const avgRegents = filteredGrades.filter(g => g.regents_score).reduce((sum, g) => sum + (g.regents_score || 0), 0) / 
      filteredGrades.filter(g => g.regents_score).length || 0;
    const uniqueStudents = new Set(filteredGrades.map(g => g.student_id)).size;
    const uniqueTopics = new Set(filteredGrades.map(g => g.topic_name)).size;
    
    return { avgGrade, avgRegents, uniqueStudents, uniqueTopics, total: filteredGrades.length };
  }, [filteredGrades]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Gradebook</CardTitle>
                {grades && (
                  <Badge variant="secondary">{grades.length} entries</Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <CardDescription>
              View and manage all saved grade history entries
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students, topics, standards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {uniqueTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExportCSV} disabled={!filteredGrades.length}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Summary Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Entries</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.uniqueStudents}</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.uniqueTopics}</p>
                  <p className="text-xs text-muted-foreground">Topics</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className={`text-2xl font-bold ${getGradeColor(stats.avgGrade)}`}>
                    {Math.round(stats.avgGrade)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Grade</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.avgRegents.toFixed(1)}/6</p>
                  <p className="text-xs text-muted-foreground">Avg Regents</p>
                </div>
              </div>
            )}

            {/* Grades Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGrades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No grade entries found</p>
                <p className="text-sm">Save student work analysis to see entries here</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('student')}
                      >
                        <span className="flex items-center">
                          Student <SortIcon field="student" />
                        </span>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('topic')}
                      >
                        <span className="flex items-center">
                          Topic <SortIcon field="topic" />
                        </span>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-center"
                        onClick={() => handleSort('grade')}
                      >
                        <span className="flex items-center justify-center">
                          Grade <SortIcon field="grade" />
                        </span>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-center"
                        onClick={() => handleSort('regents')}
                      >
                        <span className="flex items-center justify-center">
                          Regents <SortIcon field="regents" />
                        </span>
                      </TableHead>
                      <TableHead>Standard</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('date')}
                      >
                        <span className="flex items-center">
                          Date <SortIcon field="date" />
                        </span>
                      </TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGrades.map((grade) => (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">
                          {grade.student 
                            ? getDisplayName(
                                grade.student_id, 
                                grade.student.first_name, 
                                grade.student.last_name
                              )
                            : 'Unknown Student'
                          }
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={grade.topic_name}>
                          {grade.topic_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getGradeColor(grade.grade)}`}>
                            {grade.grade}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {grade.regents_score !== null ? (
                            <Badge className={getRegentsColor(grade.regents_score)}>
                              {grade.regents_score}/6
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {grade.nys_standard ? (
                            <Badge variant="outline" className="text-xs">
                              {grade.nys_standard}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(grade.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={deletingId === grade.id}
                              >
                                {deletingId === grade.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Grade Entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this grade entry from the gradebook. 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(grade.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
