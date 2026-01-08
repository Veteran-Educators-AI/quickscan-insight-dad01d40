import { useState, useRef, useEffect } from 'react';
import { Users, Upload, Loader2, Wand2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Save, UserCheck, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  studentCount: number;
}

interface ExtractedStudent {
  id: string;
  studentName: string | null;
  croppedImageBase64: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  status: 'pending' | 'analyzing' | 'completed' | 'failed' | 'saved';
  assignedStudentId: string | null;
  result?: {
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    ocrText?: string;
  };
  error?: string;
}

interface MultiStudentScannerProps {
  onClose: () => void;
  rubricSteps: { step_number: number; description: string; points: number }[];
}

export function MultiStudentScanner({ onClose, rubricSteps }: MultiStudentScannerProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const [currentGradingIndex, setCurrentGradingIndex] = useState(0);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  
  // Class and roster state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [rosterStudents, setRosterStudents] = useState<StudentOption[]>([]);
  const [classOpen, setClassOpen] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Fetch classes on mount
  useEffect(() => {
    async function fetchClasses() {
      setLoadingClasses(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, students(id)')
        .order('name');

      if (!error && data) {
        setClasses(data.map(c => ({
          id: c.id,
          name: c.name,
          studentCount: c.students?.length || 0,
        })));
      }
      setLoadingClasses(false);
    }
    fetchClasses();
  }, []);

  // Fetch students when class changes
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClassId) {
        setRosterStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_id')
        .eq('class_id', selectedClassId)
        .order('last_name');

      if (!error && data) {
        setRosterStudents(data);
      }
    }
    fetchStudents();
  }, [selectedClassId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setOriginalImage(dataUrl);
        setExtractedStudents([]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const extractStudentRegions = async () => {
    if (!originalImage) return;

    setIsExtracting(true);
    toast.info('Analyzing image to detect individual student work...');

    try {
      const { data, error } = await supabase.functions.invoke('extract-multi-student-regions', {
        body: { imageBase64: originalImage }
      });

      if (error) throw error;

      if (data.regions && data.regions.length > 0) {
        const students: ExtractedStudent[] = data.regions.map((region: any, index: number) => {
          // Try to auto-match detected name with roster
          let matchedStudentId: string | null = null;
          if (region.detectedName && rosterStudents.length > 0) {
            const detected = region.detectedName.toLowerCase();
            const match = rosterStudents.find(s => {
              const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
              const reverseName = `${s.last_name} ${s.first_name}`.toLowerCase();
              return fullName.includes(detected) || reverseName.includes(detected) || 
                     detected.includes(s.first_name.toLowerCase()) || 
                     detected.includes(s.last_name.toLowerCase());
            });
            if (match) matchedStudentId = match.id;
          }

          return {
            id: `student-${index + 1}`,
            studentName: region.detectedName || null,
            croppedImageBase64: region.croppedImage,
            boundingBox: region.boundingBox,
            status: 'pending' as const,
            assignedStudentId: matchedStudentId,
          };
        });
        
        setExtractedStudents(students);
        const matchedCount = students.filter(s => s.assignedStudentId).length;
        toast.success(`Found ${students.length} student work regions!${matchedCount > 0 ? ` Auto-matched ${matchedCount} to roster.` : ''}`);
      } else {
        toast.warning('Could not detect multiple student regions. Try a clearer image or manually segment.');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      toast.error('Failed to extract student regions');
    } finally {
      setIsExtracting(false);
    }
  };

  const assignStudent = (extractedId: string, rosterStudentId: string | null) => {
    setExtractedStudents(prev => 
      prev.map(s => s.id === extractedId ? { ...s, assignedStudentId: rosterStudentId } : s)
    );
  };

  const gradeAllStudents = async () => {
    if (extractedStudents.length === 0) return;

    setIsGrading(true);
    setCurrentGradingIndex(0);

    for (let i = 0; i < extractedStudents.length; i++) {
      setCurrentGradingIndex(i);
      
      setExtractedStudents(prev => 
        prev.map((s, idx) => idx === i ? { ...s, status: 'analyzing' } : s)
      );

      try {
        const { data, error } = await supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: extractedStudents[i].croppedImageBase64,
            rubricSteps,
            assessmentMode: 'ai',
          }
        });

        if (error) throw error;

        const analysis = data.analysis;
        
        setExtractedStudents(prev => 
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'completed',
            result: {
              score: analysis.totalScore.earned,
              maxScore: analysis.totalScore.possible,
              percentage: analysis.totalScore.percentage,
              feedback: analysis.feedback,
              ocrText: analysis.ocrText,
            }
          } : s)
        );
      } catch (err) {
        console.error(`Grading error for student ${i + 1}:`, err);
        setExtractedStudents(prev => 
          prev.map((s, idx) => idx === i ? {
            ...s,
            status: 'failed',
            error: 'Failed to analyze this work'
          } : s)
        );
      }
    }

    setIsGrading(false);
    toast.success('All student work graded!');
  };

  const saveAllResults = async () => {
    if (!user) {
      toast.error('You must be logged in to save results');
      return;
    }

    const completedWithStudent = extractedStudents.filter(
      s => s.status === 'completed' && s.assignedStudentId && s.result
    );

    if (completedWithStudent.length === 0) {
      toast.error('No graded results with assigned students to save');
      return;
    }

    setIsSaving(true);
    let savedCount = 0;

    try {
      for (const student of completedWithStudent) {
        if (!student.result || !student.assignedStudentId) continue;

        // Create a generic question ID or use a placeholder
        // In a real implementation, you might want to select a specific question
        const { data: question } = await supabase
          .from('questions')
          .select('id')
          .limit(1)
          .single();

        const questionId = question?.id;
        if (!questionId) {
          console.warn('No question found, skipping save for student');
          continue;
        }

        // Create attempt record
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            student_id: student.assignedStudentId,
            question_id: questionId,
            status: 'analyzed',
          })
          .select('id')
          .single();

        if (attemptError) {
          console.error('Error creating attempt:', attemptError);
          continue;
        }

        // Create attempt_image record
        await supabase
          .from('attempt_images')
          .insert({
            attempt_id: attempt.id,
            image_url: student.croppedImageBase64,
            ocr_text: student.result.ocrText || null,
          });

        // Create score record
        await supabase
          .from('scores')
          .insert({
            attempt_id: attempt.id,
            points_earned: student.result.score,
            notes: student.result.feedback,
            is_auto_scored: true,
            teacher_override: false,
          });

        // Update status to saved
        setExtractedStudents(prev =>
          prev.map(s => s.id === student.id ? { ...s, status: 'saved' } : s)
        );
        
        savedCount++;
      }

      toast.success(`Saved ${savedCount} student results to database!`);
    } catch (err) {
      console.error('Error saving results:', err);
      toast.error('Failed to save some results');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleResultExpanded = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const completedCount = extractedStudents.filter(s => s.status === 'completed' || s.status === 'saved').length;
  const savedCount = extractedStudents.filter(s => s.status === 'saved').length;
  const assignedCount = extractedStudents.filter(s => s.assignedStudentId).length;
  const canSave = completedCount > 0 && assignedCount > 0 && !isSaving && savedCount < completedCount;
  
  const averageScore = completedCount > 0
    ? Math.round(extractedStudents
        .filter(s => (s.status === 'completed' || s.status === 'saved') && s.result)
        .reduce((sum, s) => sum + (s.result?.percentage || 0), 0) / completedCount)
    : 0;

  // Get unassigned roster students
  const assignedIds = new Set(extractedStudents.map(s => s.assignedStudentId).filter(Boolean));
  const availableRosterStudents = rosterStudents.filter(s => !assignedIds.has(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Multi-Student Grading</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Upload a single image containing multiple students' work. The AI will detect and grade each student's work separately.
      </p>

      {/* Class Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Select Class (for roster matching)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover open={classOpen} onOpenChange={setClassOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={classOpen}
                className="w-full justify-between"
                disabled={loadingClasses || isGrading}
              >
                {selectedClass ? (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedClass.name}
                    <Badge variant="secondary" className="ml-auto">
                      {selectedClass.studentCount} students
                    </Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a class for roster matching...</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search classes..." />
                <CommandList>
                  <CommandEmpty>No classes found.</CommandEmpty>
                  <CommandGroup>
                    {classes.map((classOption) => (
                      <CommandItem
                        key={classOption.id}
                        value={classOption.name}
                        onSelect={() => {
                          setSelectedClassId(classOption.id);
                          setClassOpen(false);
                        }}
                      >
                        <span className="flex-1">{classOption.name}</span>
                        <Badge variant="outline">{classOption.studentCount}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Image Upload */}
      {!originalImage && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div 
                className="w-full min-h-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Users className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">Upload Class Image</p>
                  <p className="text-sm text-muted-foreground">
                    Photo containing multiple students' work (e.g., exit tickets, quiz papers arranged on a desk)
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">JPG</Badge>
                  <Badge variant="outline">PNG</Badge>
                  <Badge variant="outline">HEIC</Badge>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview & Extraction */}
      {originalImage && extractedStudents.length === 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <img 
              src={originalImage} 
              alt="Uploaded class work" 
              className="w-full rounded-lg object-contain max-h-[300px]"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setOriginalImage(null)}
                disabled={isExtracting}
              >
                Change Image
              </Button>
              <Button 
                variant="hero" 
                className="flex-1"
                onClick={extractStudentRegions}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Detecting Student Work...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Detect Student Regions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Students Grid */}
      {extractedStudents.length > 0 && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{extractedStudents.length} Students Detected</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {assignedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        {assignedCount} assigned
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span>• Average: <span className="font-semibold text-primary">{averageScore}%</span></span>
                    )}
                    {savedCount > 0 && (
                      <span>• {savedCount} saved</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isGrading ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Grading {currentGradingIndex + 1} of {extractedStudents.length}
                        </p>
                        <Progress 
                          value={(currentGradingIndex / extractedStudents.length) * 100} 
                          className="w-32 h-2"
                        />
                      </div>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : completedCount === extractedStudents.length ? (
                    <>
                      {canSave && (
                        <Button variant="default" onClick={saveAllResults} disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save to Database ({assignedCount})
                            </>
                          )}
                        </Button>
                      )}
                      {savedCount === completedCount && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          All Saved
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Button variant="hero" onClick={gradeAllStudents}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Grade All ({extractedStudents.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Results Grid */}
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4">
              {extractedStudents.map((student) => {
                const assignedRosterStudent = rosterStudents.find(s => s.id === student.assignedStudentId);
                
                return (
                  <Card 
                    key={student.id} 
                    className={cn(
                      "overflow-hidden transition-all",
                      student.status === 'saved' ? 'ring-2 ring-blue-500/30' :
                      student.status === 'completed' ? 'ring-2 ring-green-500/30' :
                      student.status === 'failed' ? 'ring-2 ring-destructive/30' :
                      student.status === 'analyzing' ? 'ring-2 ring-primary/50 animate-pulse' :
                      ''
                    )}
                  >
                    <div className="relative">
                      <img 
                        src={student.croppedImageBase64} 
                        alt={`Student ${student.id}`}
                        className="w-full h-24 object-cover"
                      />
                      {student.status === 'analyzing' && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                      {(student.status === 'completed' || student.status === 'saved') && student.result && (
                        <div className="absolute top-1 right-1 flex gap-1">
                          {student.status === 'saved' && (
                            <Badge variant="default" className="bg-blue-500">
                              <CheckCircle className="h-3 w-3" />
                            </Badge>
                          )}
                          <Badge 
                            variant={student.result.percentage >= 70 ? 'default' : 'destructive'}
                            className={student.result.percentage >= 70 ? 'bg-green-500' : ''}
                          >
                            {student.result.percentage}%
                          </Badge>
                        </div>
                      )}
                      {student.status === 'failed' && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2 space-y-2">
                      {/* Roster Assignment */}
                      {rosterStudents.length > 0 && student.status !== 'saved' ? (
                        <Select
                          value={student.assignedStudentId || ''}
                          onValueChange={(value) => assignStudent(student.id, value || null)}
                          disabled={isGrading || isSaving}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Assign student..." />
                          </SelectTrigger>
                          <SelectContent>
                            {student.assignedStudentId && (
                              <SelectItem value="">Unassign</SelectItem>
                            )}
                            {assignedRosterStudent && (
                              <SelectItem value={assignedRosterStudent.id}>
                                {assignedRosterStudent.last_name}, {assignedRosterStudent.first_name}
                              </SelectItem>
                            )}
                            {availableRosterStudents.map((rs) => (
                              <SelectItem key={rs.id} value={rs.id}>
                                {rs.last_name}, {rs.first_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs font-medium truncate">
                          {assignedRosterStudent 
                            ? `${assignedRosterStudent.last_name}, ${assignedRosterStudent.first_name}`
                            : student.studentName || `Student ${student.id.split('-')[1]}`}
                        </p>
                      )}

                      {(student.status === 'completed' || student.status === 'saved') && student.result && (
                        <Collapsible 
                          open={expandedResults.has(student.id)}
                          onOpenChange={() => toggleResultExpanded(student.id)}
                        >
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                            {expandedResults.has(student.id) ? (
                              <>Hide <ChevronUp className="h-3 w-3" /></>
                            ) : (
                              <>Details <ChevronDown className="h-3 w-3" /></>
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2">
                            <p className="text-xs text-muted-foreground">
                              {student.result.score}/{student.result.maxScore} points
                            </p>
                            {student.result.feedback && (
                              <p className="text-xs mt-1 line-clamp-3">{student.result.feedback}</p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      {student.status === 'failed' && (
                        <p className="text-xs text-destructive">{student.error}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setOriginalImage(null);
                setExtractedStudents([]);
              }}
              disabled={isGrading || isSaving}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
