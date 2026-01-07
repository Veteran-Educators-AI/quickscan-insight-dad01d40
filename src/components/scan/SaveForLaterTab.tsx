import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Clock, User, Trash2, Play, CheckCircle, ChevronDown, Check, FileQuestion, PlayCircle, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { ClassStudentSelector } from './ClassStudentSelector';
import { CameraModal } from './CameraModal';
import { ImagePreview } from './ImagePreview';
import { MultiQuestionSelector } from './MultiQuestionSelector';
import { cn } from '@/lib/utils';

interface PendingScan {
  id: string;
  image_url: string;
  student_id: string | null;
  class_id: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
  } | null;
  class?: {
    name: string;
  } | null;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface SaveForLaterTabProps {
  pendingScans: PendingScan[];
  onRefresh: () => void;
  onAnalyzeScan: (scan: PendingScan, questionIds: string[]) => Promise<void>;
}

export function SaveForLaterTab({ pendingScans, onRefresh, onAnalyzeScan }: SaveForLaterTabProps) {
  const { user } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [openStudentPicker, setOpenStudentPicker] = useState<string | null>(null);
  // Track selected questions per scan
  const [scanQuestions, setScanQuestions] = useState<Record<string, string[]>>({});
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'analyzed'>('all');
  
  // Bulk analyze state
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkCurrentScanId, setBulkCurrentScanId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const updateScanQuestions = (scanId: string, questionIds: string[]) => {
    setScanQuestions(prev => ({ ...prev, [scanId]: questionIds }));
  };

  // Fetch all students for the teacher's classes
  useEffect(() => {
    const fetchAllStudents = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          class_id,
          classes!inner(teacher_id)
        `)
        .eq('classes.teacher_id', user.id)
        .order('last_name');

      if (!error && data) {
        setAllStudents(data.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
        })));
      }
    };

    fetchAllStudents();
  }, [user]);

  const handleCameraCapture = useCallback((imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setShowCamera(false);
  }, []);

  const handlePreviewConfirm = useCallback(async (finalImageDataUrl: string) => {
    await saveImageForLater(finalImageDataUrl);
    setCapturedImage(null);
  }, [selectedClassId, selectedStudentIds]);

  const handlePreviewRetake = useCallback(() => {
    setCapturedImage(null);
    setShowCamera(true);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        await saveImageForLater(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const saveImageForLater = async (imageDataUrl: string) => {
    if (!user) {
      toast.error('Please log in to save scans');
      return;
    }

    setIsSaving(true);
    try {
      // Convert base64 to blob and upload to storage
      const base64Data = imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const fileName = `${user.id}/${Date.now()}-pending.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('scan-images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('scan-images')
        .getPublicUrl(fileName);

      // Save to pending_scans table
      const studentId = selectedStudentIds.length === 1 ? selectedStudentIds[0] : null;
      
      const { error: insertError } = await supabase
        .from('pending_scans')
        .insert({
          teacher_id: user.id,
          student_id: studentId,
          class_id: selectedClassId,
          image_url: urlData.publicUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast.success('Image saved for later analysis');
      onRefresh();
    } catch (error) {
      console.error('Error saving scan:', error);
      toast.error('Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScan = async (scanId: string) => {
    try {
      const { error } = await supabase
        .from('pending_scans')
        .delete()
        .eq('id', scanId);

      if (error) throw error;

      toast.success('Scan deleted');
      onRefresh();
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast.error('Failed to delete scan');
    }
  };

  const handleAssignStudent = async (scanId: string, studentId: string | null) => {
    try {
      const { error } = await supabase
        .from('pending_scans')
        .update({ student_id: studentId })
        .eq('id', scanId);

      if (error) throw error;

      const studentName = studentId 
        ? allStudents.find(s => s.id === studentId)
        : null;
      
      toast.success(studentId 
        ? `Assigned to ${studentName?.first_name} ${studentName?.last_name}`
        : 'Student unassigned'
      );
      setOpenStudentPicker(null);
      onRefresh();
    } catch (error) {
      console.error('Error assigning student:', error);
      toast.error('Failed to assign student');
    }
  };

  // Get scans eligible for bulk analysis (have student assigned + questions selected)
  const getEligibleScansForBulk = () => {
    return pendingScans.filter(scan => {
      const questionIds = scanQuestions[scan.id] || [];
      return scan.student_id && questionIds.length > 0 && scan.status === 'pending';
    });
  };

  const handleBulkAnalyze = async () => {
    const eligibleScans = getEligibleScansForBulk();
    
    if (eligibleScans.length === 0) {
      toast.error('No scans ready for bulk analysis. Ensure scans have a student assigned and questions selected.');
      return;
    }

    setIsBulkAnalyzing(true);
    setBulkProgress(0);
    
    let completed = 0;
    const total = eligibleScans.length;

    for (const scan of eligibleScans) {
      setBulkCurrentScanId(scan.id);
      try {
        const questionIds = scanQuestions[scan.id] || [];
        await onAnalyzeScan(scan, questionIds);
        completed++;
        setBulkProgress((completed / total) * 100);
      } catch (error) {
        console.error(`Error analyzing scan ${scan.id}:`, error);
        toast.error(`Failed to analyze scan for ${scan.student?.first_name || 'Unknown'}`);
      }
    }

    setIsBulkAnalyzing(false);
    setBulkCurrentScanId(null);
    setBulkProgress(0);
    toast.success(`Bulk analysis complete: ${completed}/${total} scans analyzed`);
    onRefresh();
  };

  const eligibleCount = getEligibleScansForBulk().length;

  // Filter scans based on selected status
  const filteredScans = pendingScans.filter(scan => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return scan.status === 'pending';
    if (statusFilter === 'analyzed') return scan.status === 'analyzed';
    return true;
  });

  const pendingCount = pendingScans.filter(s => s.status === 'pending').length;
  const analyzedCount = pendingScans.filter(s => s.status === 'analyzed').length;

  const isNativeContext = typeof window !== 'undefined' &&
    (window.navigator.userAgent.includes('Capacitor') || 
     window.navigator.userAgent.includes('wv') ||
     (window as any).Capacitor);

  return (
    <div className="space-y-4">
      {/* Image Preview Modal */}
      {capturedImage && (
        <ImagePreview
          imageDataUrl={capturedImage}
          onConfirm={handlePreviewConfirm}
          onRetake={handlePreviewRetake}
        />
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {/* Class & Student Selector */}
      <ClassStudentSelector
        selectedClassId={selectedClassId}
        selectedStudentIds={selectedStudentIds}
        onClassChange={setSelectedClassId}
        onStudentsChange={setSelectedStudentIds}
        disabled={isSaving}
      />

      {/* Capture/Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Save for Later</h2>
              <p className="text-sm text-muted-foreground">
                Capture student work now and analyze when you're ready
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                ref={nativeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {isNativeContext ? (
                <Button 
                  variant="scan" 
                  size="lg"
                  onClick={() => nativeInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
              ) : (
                <Button 
                  variant="scan" 
                  size="lg"
                  onClick={() => setShowCamera(true)}
                  disabled={isSaving}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
              )}

              <Button 
                variant="outline" 
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload Images
              </Button>
            </div>

            {isSaving && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Saving image...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Scans List */}
      {pendingScans.length > 0 && (
        <div className="space-y-3">
          {/* Bulk Analyze Section */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Bulk Analyze
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {eligibleCount} scan(s) ready (with student & questions assigned)
                  </p>
                </div>
                <Button 
                  onClick={handleBulkAnalyze}
                  disabled={isBulkAnalyzing || eligibleCount === 0}
                  size="sm"
                  variant="hero"
                >
                  {isBulkAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Analyze All ({eligibleCount})
                    </>
                  )}
                </Button>
              </div>
              
              {isBulkAnalyzing && (
                <div className="space-y-2">
                  <Progress value={bulkProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round(bulkProgress)}% complete
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Saved Scans ({pendingScans.length})
            </h3>
            
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(value) => value && setStatusFilter(value as 'all' | 'pending' | 'analyzed')}
              className="justify-start"
            >
              <ToggleGroupItem value="all" aria-label="Show all scans" size="sm">
                All ({pendingScans.length})
              </ToggleGroupItem>
              <ToggleGroupItem value="pending" aria-label="Show pending scans" size="sm">
                Pending ({pendingCount})
              </ToggleGroupItem>
              <ToggleGroupItem value="analyzed" aria-label="Show analyzed scans" size="sm">
                Analyzed ({analyzedCount})
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {filteredScans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No {statusFilter === 'all' ? '' : statusFilter} scans found</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScans.map((scan) => {
              const isCurrentlyAnalyzing = bulkCurrentScanId === scan.id;
              return (
              <Card key={scan.id} className={cn(
                "overflow-hidden transition-all",
                isCurrentlyAnalyzing && "ring-2 ring-primary animate-pulse"
              )}>
                <div className="aspect-[4/3] relative bg-muted">
                  <img
                    src={scan.image_url}
                    alt="Saved scan"
                    className="w-full h-full object-cover"
                  />
                  {scan.status === 'analyzed' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Analyzed
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  {/* Student Selector Dropdown */}
                  <Popover 
                    open={openStudentPicker === scan.id} 
                    onOpenChange={(open) => setOpenStudentPicker(open ? scan.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-left font-normal"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className={cn(
                            "truncate",
                            !scan.student && "text-muted-foreground italic"
                          )}>
                            {scan.student 
                              ? `${scan.student.first_name} ${scan.student.last_name}`
                              : 'Assign student...'}
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search students..." />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup>
                            {scan.student_id && (
                              <CommandItem
                                value="unassign"
                                onSelect={() => handleAssignStudent(scan.id, null)}
                                className="text-muted-foreground"
                              >
                                <span className="italic">Unassign student</span>
                              </CommandItem>
                            )}
                            {allStudents.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={`${student.first_name} ${student.last_name}`}
                                onSelect={() => handleAssignStudent(scan.id, student.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    scan.student_id === student.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {student.first_name} {student.last_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Multi-Question Selector */}
                  <MultiQuestionSelector
                    selectedQuestionIds={scanQuestions[scan.id] || []}
                    onQuestionsChange={(ids) => updateScanQuestions(scan.id, ids)}
                  />
                  
                  {scan.class && (
                    <p className="text-xs text-muted-foreground">
                      {scan.class.name}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.created_at).toLocaleDateString()} at{' '}
                    {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="hero"
                      size="sm"
                      className="flex-1"
                      onClick={() => onAnalyzeScan(scan, scanQuestions[scan.id] || [])}
                      disabled={(scanQuestions[scan.id] || []).length === 0 || isBulkAnalyzing}
                    >
                      {isCurrentlyAnalyzing ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      {(scanQuestions[scan.id] || []).length > 0 
                        ? `Analyze (${(scanQuestions[scan.id] || []).length})` 
                        : 'Select Questions'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteScan(scan.id)}
                      disabled={isBulkAnalyzing}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
          )}
        </div>
      )}

      {pendingScans.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved scans yet</p>
            <p className="text-sm">Capture student work to save for later analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
