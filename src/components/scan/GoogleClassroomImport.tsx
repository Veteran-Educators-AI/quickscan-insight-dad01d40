import { useState, useEffect } from 'react';
import { BookOpen, Users, FileText, Download, Loader2, RefreshCw, ExternalLink, ChevronRight, AlertCircle, CheckCircle, Image as ImageIcon, ArrowLeft, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useGoogleClassroom, GoogleClassroomCourse, GoogleClassroomSubmission } from '@/hooks/useGoogleClassroom';
import { supabase } from '@/integrations/supabase/client';

interface GoogleClassroomImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (submissions: ImportedSubmission[]) => void;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  state: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours: number; minutes: number };
  maxPoints?: number;
  workType: string;
}

export interface ImportedSubmission {
  studentName: string;
  studentEmail?: string;
  courseWorkTitle: string;
  imageUrl?: string;
  imageBase64?: string;
  attachments: Array<{
    type: 'drive' | 'link';
    title: string;
    url: string;
    thumbnailUrl?: string;
  }>;
  state: string;
  assignedGrade?: number;
}

type ImportStep = 'courses' | 'coursework' | 'submissions' | 'importing' | 'complete';

export function GoogleClassroomImport({ open, onOpenChange, onImportComplete }: GoogleClassroomImportProps) {
  const { loading, courses, fetchCourses, fetchStudents, fetchCourseWork, fetchSubmissions, hasClassroomAccess } = useGoogleClassroom();
  
  const [step, setStep] = useState<ImportStep>('courses');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<GoogleClassroomCourse | null>(null);
  const [courseWorkList, setCourseWorkList] = useState<CourseWork[]>([]);
  const [selectedCourseWork, setSelectedCourseWork] = useState<CourseWork | null>(null);
  const [submissions, setSubmissions] = useState<GoogleClassroomSubmission[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, { name: string; email?: string }>>({});
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [importedSubmissions, setImportedSubmissions] = useState<ImportedSubmission[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [loadingCourseWork, setLoadingCourseWork] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Check access on open
  useEffect(() => {
    if (open) {
      checkAccess();
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('courses');
      setSelectedCourse(null);
      setCourseWorkList([]);
      setSelectedCourseWork(null);
      setSubmissions([]);
      setSelectedSubmissionIds([]);
      setImportedSubmissions([]);
      setImportProgress(0);
    }
  }, [open]);

  const checkAccess = async () => {
    const access = await hasClassroomAccess();
    setHasAccess(access);
    if (access) {
      fetchCourses();
    }
  };

  const handleSelectCourse = async (course: GoogleClassroomCourse) => {
    setSelectedCourse(course);
    setLoadingCourseWork(true);
    
    try {
      // Fetch students for this course
      const students = await fetchStudents(course.id);
      const map: Record<string, { name: string; email?: string }> = {};
      students.forEach(s => {
        map[s.userId] = {
          name: s.profile.name.fullName,
          email: s.profile.emailAddress,
        };
      });
      setStudentMap(map);
      
      // Fetch coursework
      const work = await fetchCourseWork(course.id);
      setCourseWorkList(work.map((w: any) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        state: w.state,
        dueDate: w.dueDate,
        dueTime: w.dueTime,
        maxPoints: w.maxPoints,
        workType: w.workType,
      })));
      
      setStep('coursework');
    } catch (error) {
      console.error('Error loading course data:', error);
      toast.error('Failed to load course data');
    } finally {
      setLoadingCourseWork(false);
    }
  };

  const handleSelectCourseWork = async (work: CourseWork) => {
    setSelectedCourseWork(work);
    setLoadingSubmissions(true);
    
    try {
      const subs = await fetchSubmissions(selectedCourse!.id, work.id);
      // Filter to only show submitted work
      const submittedWork = subs.filter(s => 
        s.state === 'TURNED_IN' || s.state === 'RETURNED' || s.state === 'RECLAIMED_BY_STUDENT'
      );
      setSubmissions(submittedWork);
      setStep('submissions');
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const toggleSubmission = (submissionId: string) => {
    setSelectedSubmissionIds(prev => {
      if (prev.includes(submissionId)) {
        return prev.filter(id => id !== submissionId);
      }
      return [...prev, submissionId];
    });
  };

  const selectAllSubmissions = () => {
    if (selectedSubmissionIds.length === submissions.length) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(submissions.map(s => s.id));
    }
  };

  const handleImportSubmissions = async () => {
    if (selectedSubmissionIds.length === 0) {
      toast.error('Please select at least one submission');
      return;
    }

    setIsImporting(true);
    setStep('importing');
    setImportProgress(0);

    const imported: ImportedSubmission[] = [];
    const selectedSubs = submissions.filter(s => selectedSubmissionIds.includes(s.id));
    
    for (let i = 0; i < selectedSubs.length; i++) {
      const sub = selectedSubs[i];
      const student = studentMap[sub.userId];
      
      const attachments: ImportedSubmission['attachments'] = [];
      
      if (sub.assignmentSubmission?.attachments) {
        for (const attachment of sub.assignmentSubmission.attachments) {
          if (attachment.driveFile) {
            attachments.push({
              type: 'drive',
              title: attachment.driveFile.title,
              url: attachment.driveFile.alternateLink,
              thumbnailUrl: attachment.driveFile.thumbnailUrl,
            });
          } else if (attachment.link) {
            attachments.push({
              type: 'link',
              title: attachment.link.title || 'Link',
              url: attachment.link.url,
              thumbnailUrl: attachment.link.thumbnailUrl,
            });
          }
        }
      }

      imported.push({
        studentName: student?.name || 'Unknown Student',
        studentEmail: student?.email,
        courseWorkTitle: selectedCourseWork?.title || 'Unknown Assignment',
        attachments,
        state: sub.state,
        assignedGrade: sub.assignedGrade,
      });

      setImportProgress(Math.round(((i + 1) / selectedSubs.length) * 100));
    }

    setImportedSubmissions(imported);
    setIsImporting(false);
    setStep('complete');
    
    toast.success(`Imported ${imported.length} submission(s)`);
    onImportComplete?.(imported);
  };

  const getSubmissionStateColor = (state: string) => {
    switch (state) {
      case 'TURNED_IN':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'RETURNED':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'RECLAIMED_BY_STUDENT':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-muted';
    }
  };

  const renderStep = () => {
    if (hasAccess === null) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Checking Google Classroom access...</p>
        </div>
      );
    }

    if (!hasAccess) {
      return (
        <div className="space-y-6 text-center py-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Google Classroom Not Connected</h3>
            <p className="text-muted-foreground mt-2">
              To import student work from Google Classroom, you need to sign in with your Google account 
              and grant Classroom access.
            </p>
          </div>
          <Alert>
            <AlertDescription>
              Go to Settings → Integrations and connect your Google account with Classroom permissions.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      );
    }

    switch (step) {
      case 'courses':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Select a Course</h3>
                <p className="text-sm text-muted-foreground">Choose a class to import work from</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchCourses()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : courses.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active courses found. Make sure you're a teacher in at least one active Google Classroom course.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {courses.map(course => (
                    <Card
                      key={course.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectCourse(course)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{course.name}</p>
                            {course.section && (
                              <p className="text-sm text-muted-foreground">{course.section}</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'coursework':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('courses')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h3 className="font-semibold">Select an Assignment</h3>
                <p className="text-sm text-muted-foreground">{selectedCourse?.name}</p>
              </div>
            </div>

            {loadingCourseWork ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : courseWorkList.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No assignments found in this course.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {courseWorkList.map(work => (
                    <Card
                      key={work.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectCourseWork(work)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-500/10">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">{work.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {work.workType}
                              </Badge>
                              {work.maxPoints && (
                                <span className="text-xs text-muted-foreground">
                                  {work.maxPoints} points
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );

      case 'submissions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep('coursework')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">Select Submissions</h3>
                  <p className="text-sm text-muted-foreground">{selectedCourseWork?.title}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllSubmissions}
              >
                {selectedSubmissionIds.length === submissions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : submissions.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No turned-in submissions found for this assignment.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {submissions.map(sub => {
                      const student = studentMap[sub.userId];
                      const isSelected = selectedSubmissionIds.includes(sub.id);
                      const hasAttachments = (sub.assignmentSubmission?.attachments?.length || 0) > 0;
                      
                      return (
                        <Card
                          key={sub.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
                          onClick={() => toggleSubmission(sub.id)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSubmission(sub.id)}
                            />
                            <div className="p-2 rounded-full bg-muted">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{student?.name || 'Unknown Student'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${getSubmissionStateColor(sub.state)}`}>
                                  {sub.state.replace(/_/g, ' ')}
                                </Badge>
                                {hasAttachments && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3" />
                                    {sub.assignmentSubmission?.attachments?.length} file(s)
                                  </span>
                                )}
                                {sub.assignedGrade !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    Grade: {sub.assignedGrade}/{selectedCourseWork?.maxPoints || '?'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a
                              href={sub.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmissionIds.length} of {submissions.length} selected
                  </p>
                  <Button
                    onClick={handleImportSubmissions}
                    disabled={selectedSubmissionIds.length === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Import & Analyze
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case 'importing':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Importing Submissions</h3>
              <p className="text-muted-foreground mt-2">
                Fetching student work from Google Classroom...
              </p>
            </div>
            <Progress value={importProgress} className="w-full max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground mt-2">
                {importedSubmissions.length} submission(s) ready for analysis
              </p>
            </div>

            <ScrollArea className="h-[250px] border rounded-lg p-3">
              <div className="space-y-2">
                {importedSubmissions.map((sub, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sub.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.attachments.length} attachment(s)
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Open each submission's attachments in the batch queue to analyze student work with AI grading.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('submissions')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Import More
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Import from Google Classroom
          </DialogTitle>
          <DialogDescription>
            Browse your courses and import completed student work for AI analysis
          </DialogDescription>
        </DialogHeader>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
