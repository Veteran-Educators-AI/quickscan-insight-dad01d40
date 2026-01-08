import { useState, useRef } from 'react';
import { Users, Upload, Camera, Loader2, Wand2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedStudent {
  id: string;
  studentName: string | null;
  croppedImageBase64: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  result?: {
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
  };
  error?: string;
}

interface MultiStudentScannerProps {
  onClose: () => void;
  rubricSteps: { step_number: number; description: string; points: number }[];
}

export function MultiStudentScanner({ onClose, rubricSteps }: MultiStudentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [extractedStudents, setExtractedStudents] = useState<ExtractedStudent[]>([]);
  const [currentGradingIndex, setCurrentGradingIndex] = useState(0);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

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
        const students: ExtractedStudent[] = data.regions.map((region: any, index: number) => ({
          id: `student-${index + 1}`,
          studentName: region.detectedName || null,
          croppedImageBase64: region.croppedImage,
          boundingBox: region.boundingBox,
          status: 'pending' as const,
        }));
        
        setExtractedStudents(students);
        toast.success(`Found ${students.length} student work regions!`);
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

  const completedCount = extractedStudents.filter(s => s.status === 'completed').length;
  const averageScore = completedCount > 0
    ? Math.round(extractedStudents
        .filter(s => s.status === 'completed' && s.result)
        .reduce((sum, s) => sum + (s.result?.percentage || 0), 0) / completedCount)
    : 0;

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
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{extractedStudents.length} Students Detected</p>
                  {completedCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Average Score: <span className="font-semibold text-primary">{averageScore}%</span>
                    </p>
                  )}
                </div>
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
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Graded
                  </Badge>
                ) : (
                  <Button variant="hero" onClick={gradeAllStudents}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Grade All ({extractedStudents.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Student Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {extractedStudents.map((student) => (
              <Card 
                key={student.id} 
                className={`overflow-hidden transition-all ${
                  student.status === 'completed' ? 'ring-2 ring-green-500/30' :
                  student.status === 'failed' ? 'ring-2 ring-destructive/30' :
                  student.status === 'analyzing' ? 'ring-2 ring-primary/50 animate-pulse' :
                  ''
                }`}
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
                  {student.status === 'completed' && student.result && (
                    <div className="absolute top-1 right-1">
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
                <CardContent className="p-2">
                  <p className="text-xs font-medium truncate">
                    {student.studentName || `Student ${student.id.split('-')[1]}`}
                  </p>
                  {student.status === 'completed' && student.result && (
                    <Collapsible 
                      open={expandedResults.has(student.id)}
                      onOpenChange={() => toggleResultExpanded(student.id)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
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
                    <p className="text-xs text-destructive mt-1">{student.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setOriginalImage(null);
                setExtractedStudents([]);
              }}
              disabled={isGrading}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
