import { useState, useRef } from 'react';
import { Bot, User, FileImage, Upload, ArrowRight, CheckCircle, Loader2, X, BookOpen, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { resizeImage, blobToBase64 } from '@/lib/imageUtils';

export type GradingMode = 'ai' | 'teacher-guided' | 'teacher-manual';

interface GradingModeSelectorProps {
  studentImage: string;
  isAnalyzing: boolean;
  onSelectAI: () => void;
  onSelectTeacherGuided: (answerGuideImage: string) => void;
  onSelectTeacherManual: () => void;
  onCancel: () => void;
}

export function GradingModeSelector({
  studentImage,
  isAnalyzing,
  onSelectAI,
  onSelectTeacherGuided,
  onSelectTeacherManual,
  onCancel,
}: GradingModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GradingMode | null>(null);
  const [answerGuideImage, setAnswerGuideImage] = useState<string | null>(null);
  const answerGuideInputRef = useRef<HTMLInputElement>(null);

  const handleAnswerGuideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedBlob = await resizeImage(file);
        const dataUrl = await blobToBase64(resizedBlob);
        setAnswerGuideImage(dataUrl);
        toast.success('Answer guide uploaded!');
      } catch (err) {
        console.error('Error resizing image:', err);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAnswerGuideImage(dataUrl);
          toast.success('Answer guide uploaded!');
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleProceed = () => {
    if (selectedMode === 'ai') {
      onSelectAI();
    } else if (selectedMode === 'teacher-guided' && answerGuideImage) {
      onSelectTeacherGuided(answerGuideImage);
    } else if (selectedMode === 'teacher-manual') {
      onSelectTeacherManual();
    }
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <div>
              <p className="font-medium">
                {selectedMode === 'teacher-guided' 
                  ? 'Analyzing with your answer guide...' 
                  : 'Analyzing with AI...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedMode === 'teacher-guided'
                  ? 'AI is using your grading criteria to evaluate the student\'s work'
                  : 'Running OCR and auto-grading'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <img 
            src={studentImage} 
            alt="Student work" 
            className="w-full object-contain max-h-48 rounded-md" 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Choose Grading Method</CardTitle>
          <CardDescription>
            Select how you want to grade this student's work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs 
            value={selectedMode || ''} 
            onValueChange={(v) => setSelectedMode(v as GradingMode)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai" className="gap-2">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">AI Only</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="teacher-guided" className="gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Guided AI</span>
                <span className="sm:hidden">Guide</span>
              </TabsTrigger>
              <TabsTrigger value="teacher-manual" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Manual</span>
                <span className="sm:hidden">Manual</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="mt-4">
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">AI Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      AI will automatically grade using NYS Regents standards. 
                      Best for quick, standards-aligned grading.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">Auto-grading</Badge>
                  <Badge variant="secondary">NYS Standards</Badge>
                  <Badge variant="secondary">Fast</Badge>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teacher-guided" className="mt-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Teacher-Guided AI</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload your answer key or rubric. AI will grade based on YOUR criteria, 
                      not just standards. Best for customized assessments.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Your Rubric</Badge>
                  <Badge variant="secondary">Custom Grading</Badge>
                  <Badge variant="secondary">Compare Later</Badge>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Upload Your Answer Guide</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={answerGuideInputRef}
                    onChange={handleAnswerGuideUpload}
                    className="hidden"
                  />
                  
                  {answerGuideImage ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <img 
                          src={answerGuideImage} 
                          alt="Answer guide" 
                          className="w-full max-h-32 object-contain rounded-md border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => setAnswerGuideImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Answer guide ready
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => answerGuideInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload Answer Key / Rubric Image
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teacher-manual" className="mt-4">
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted-foreground/10 rounded-full">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Manual Scoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload your solution and score manually. AI will provide 
                      suggestions but you have full control. Best for detailed feedback.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">Full Control</Badge>
                  <Badge variant="secondary">AI Suggestions</Badge>
                  <Badge variant="secondary">Detailed</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {selectedMode && (
            <Button 
              onClick={handleProceed}
              disabled={selectedMode === 'teacher-guided' && !answerGuideImage}
              className="w-full gap-2"
            >
              {selectedMode === 'teacher-guided' && !answerGuideImage ? (
                'Upload Answer Guide to Continue'
              ) : (
                <>
                  Proceed with {selectedMode === 'ai' ? 'AI Analysis' : selectedMode === 'teacher-guided' ? 'Guided AI' : 'Manual Scoring'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
