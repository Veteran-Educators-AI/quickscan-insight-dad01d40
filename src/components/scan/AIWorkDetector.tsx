import { useState } from 'react';
import { Bot, AlertTriangle, CheckCircle, Loader2, ShieldAlert, XCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AIDetectionResult {
  isLikelyAI: boolean;
  confidence: number;
  indicators: string[];
  explanation: string;
}

interface AIWorkDetectorProps {
  text: string;
  studentName?: string;
  questionContext?: string;
  onResult?: (result: AIDetectionResult) => void;
  onRejection?: (rejected: boolean) => void;
}

export function AIWorkDetector({ text, studentName, questionContext, onResult, onRejection }: AIWorkDetectorProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIDetectionResult | null>(null);

  const isRejected = result?.isLikelyAI && result.confidence > 80;

  const analyzeWork = async () => {
    if (!text || text.trim().length < 20) {
      toast({
        title: 'Insufficient text',
        description: 'Need at least 20 characters to analyze.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-ai-work', {
        body: { text, studentName, questionContext }
      });

      if (error) throw error;

      setResult(data);
      onResult?.(data);

      const rejected = data.isLikelyAI && data.confidence > 80;
      onRejection?.(rejected);

      if (rejected) {
        toast({
          title: '🚫 Work Rejected - AI Content Detected',
          description: `${data.confidence}% confidence this is AI-generated. Student must redo this assignment.`,
          variant: 'destructive',
        });
      } else if (data.isLikelyAI && data.confidence > 70) {
        toast({
          title: '⚠️ Potential AI-generated content detected',
          description: `${data.confidence}% confidence. Review the indicators below.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('AI detection error:', error);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze the work for AI content.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number, isAI: boolean) => {
    if (!isAI) return 'text-emerald-600';
    if (confidence >= 80) return 'text-red-600';
    if (confidence >= 60) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getProgressColor = (confidence: number, isAI: boolean) => {
    if (!isAI) return '[&>div]:bg-emerald-500';
    if (confidence >= 80) return '[&>div]:bg-red-500';
    if (confidence >= 60) return '[&>div]:bg-orange-500';
    return '[&>div]:bg-yellow-500';
  };

  return (
    <Card className={cn(
      isRejected
        ? 'border-red-500 bg-red-100/80 dark:bg-red-950/40 ring-2 ring-red-500' 
        : result?.isLikelyAI && result.confidence > 70 
          ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' 
          : 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          AI Work Detection
        </CardTitle>
        <CardDescription>
          Check if the student's work appears to be AI-generated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={analyzeWork}
            disabled={isAnalyzing || text.trim().length < 20}
            variant="outline"
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Check for AI Content
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Rejection Banner */}
            {isRejected && (
              <div className="bg-red-600 text-white p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle className="h-5 w-5" />
                  WORK REJECTED
                </div>
                <p className="text-sm">
                  This submission has been flagged as AI-generated with {result.confidence}% confidence. 
                  The student must redo this assignment using their own work.
                </p>
                <div className="flex items-center gap-2 text-sm bg-red-700 p-2 rounded mt-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Student needs to resubmit original work</span>
                </div>
              </div>
            )}

            {/* Result Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRejected ? (
                  <XCircle className="h-5 w-5 text-red-600" />
                ) : result.isLikelyAI ? (
                  <AlertTriangle className={cn('h-5 w-5', getConfidenceColor(result.confidence, true))} />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                <span className="font-medium">
                  {isRejected ? 'AI Work - Rejected' : result.isLikelyAI ? 'Likely AI-Generated' : 'Appears Human-Written'}
                </span>
              </div>
              <Badge variant={result.isLikelyAI ? 'destructive' : 'outline'}>
                {result.confidence}% confident
              </Badge>
            </div>

            {/* Confidence Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">AI Likelihood</span>
                <span className={cn('font-medium', getConfidenceColor(result.confidence, result.isLikelyAI))}>
                  {isRejected ? 'Rejected' : result.isLikelyAI ? 'High' : 'Low'}
                </span>
              </div>
              <Progress 
                value={result.isLikelyAI ? result.confidence : 100 - result.confidence} 
                className={cn('h-2', getProgressColor(result.confidence, result.isLikelyAI))}
              />
            </div>

            {/* Explanation */}
            <p className="text-sm text-muted-foreground">{result.explanation}</p>

            {/* Indicators */}
            {result.indicators.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Indicators found:</p>
                <ul className="space-y-1">
                  {result.indicators.map((indicator, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={result.isLikelyAI ? 'text-orange-500' : 'text-emerald-500'}>•</span>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Re-analyze button */}
            <Button
              onClick={() => {
                setResult(null);
                onRejection?.(false);
              }}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Clear & Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
