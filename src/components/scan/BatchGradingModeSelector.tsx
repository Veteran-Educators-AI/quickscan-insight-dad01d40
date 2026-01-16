import { useState, useRef } from 'react';
import { Bot, User, FileImage, Upload, ArrowRight, CheckCircle, X, BookOpen, Scale, Play, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { resizeImage, blobToBase64 } from '@/lib/imageUtils';

export type BatchGradingMode = 'ai' | 'teacher-guided' | 'manual';

interface BatchGradingModeSelectorProps {
  itemCount: number;
  onSelectMode: (mode: BatchGradingMode, answerGuideImage?: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function BatchGradingModeSelector({
  itemCount,
  onSelectMode,
  onCancel,
  isProcessing = false,
}: BatchGradingModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<BatchGradingMode | null>(null);
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
      onSelectMode('ai');
    } else if (selectedMode === 'teacher-guided' && answerGuideImage) {
      onSelectMode('teacher-guided', answerGuideImage);
    } else if (selectedMode === 'manual') {
      onSelectMode('manual');
    }
  };

  const needsGuide = selectedMode === 'teacher-guided';
  const canProceed = selectedMode === 'ai' || selectedMode === 'manual' || (selectedMode === 'teacher-guided' && answerGuideImage);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Choose Grading Method
        </CardTitle>
        <CardDescription>
          Select how you want to grade {itemCount} paper{itemCount !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={answerGuideInputRef}
          onChange={handleAnswerGuideUpload}
          accept="image/*"
          className="hidden"
        />

        <Tabs value={selectedMode || ''} onValueChange={(v) => setSelectedMode(v as BatchGradingMode)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="ai" className="flex items-center gap-1.5">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Only</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="teacher-guided" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">With Guide</span>
              <span className="sm:hidden">Guide</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1.5">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Manual</span>
              <span className="sm:hidden">Manual</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Bot className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">AI Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    AI grades each paper using its knowledge of math concepts and common rubrics.
                    Fast and consistent grading for the entire batch.
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                Fastest option for batch grading
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teacher-guided" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <BookOpen className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Teacher-Guided AI</p>
                  <p className="text-xs text-muted-foreground">
                    Upload your answer key or solution. AI compares each student's work 
                    against your guide for more accurate grading.
                  </p>
                </div>
              </div>

              {/* Answer Guide Upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Answer Guide (Required)</p>
                {answerGuideImage ? (
                  <div className="relative">
                    <img 
                      src={answerGuideImage} 
                      alt="Answer guide" 
                      className="w-full max-h-40 object-contain rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setAnswerGuideImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => answerGuideInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Upload answer key / solution</span>
                    </div>
                  </Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                Same guide applied to all {itemCount} papers
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Pencil className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Manual Scoring</p>
                  <p className="text-xs text-muted-foreground">
                    Skip AI analysis. You'll manually enter scores for each paper 
                    after viewing the scanned work.
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                Full control over grading
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            variant="hero" 
            className="flex-1"
            onClick={handleProceed}
            disabled={!canProceed || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {selectedMode === 'manual' ? 'Start Manual Scoring' : `Analyze ${itemCount} Papers`}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
