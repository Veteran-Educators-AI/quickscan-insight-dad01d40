import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GenerationProgressCounterProps {
  isGenerating: boolean;
  questionCount: number;
  includeImages: boolean;
  includeSvg?: boolean;
  currentStep?: string;
}

// Time estimates in seconds (should match GenerationTimeEstimator)
const TIME_ESTIMATES = {
  basePerQuestion: 0.8,
  imagePerQuestion: 2,
  svgPerQuestion: 1,
  overhead: 2,
};

export function GenerationProgressCounter({
  isGenerating,
  questionCount,
  includeImages,
  includeSvg = true,
  currentStep,
}: GenerationProgressCounterProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Calculate total estimated time
  const textOnlyTime = TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion);
  const totalEstimate = includeImages 
    ? (includeSvg 
        ? textOnlyTime + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5) + (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3)
        : textOnlyTime + (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3))
    : (includeSvg 
        ? textOnlyTime + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5)
        : textOnlyTime);

  useEffect(() => {
    if (isGenerating && !startTime) {
      setStartTime(Date.now());
      setElapsedSeconds(0);
    } else if (!isGenerating) {
      setStartTime(null);
    }
  }, [isGenerating, startTime]);

  useEffect(() => {
    if (!isGenerating || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime]);

  if (!isGenerating) return null;

  const progress = Math.min((elapsedSeconds / totalEstimate) * 100, 95); // Cap at 95% until complete
  const remainingSeconds = Math.max(0, totalEstimate - elapsedSeconds);

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`;
  };

  // Determine current phase based on elapsed time
  const getPhase = () => {
    if (currentStep) return currentStep;
    const textPhaseEnd = TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion);
    const svgPhaseEnd = textPhaseEnd + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5);
    
    if (elapsedSeconds < TIME_ESTIMATES.overhead) {
      return 'Initializing...';
    } else if (elapsedSeconds < textPhaseEnd) {
      return 'Generating questions...';
    } else if (includeSvg && elapsedSeconds < svgPhaseEnd) {
      return 'Creating diagrams...';
    } else if (includeImages) {
      return 'Generating images...';
    }
    return 'Finalizing...';
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">{getPhase()}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTime(remainingSeconds)} remaining</span>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Elapsed: {formatTime(elapsedSeconds)}</span>
        <span>{Math.round(progress)}% complete</span>
      </div>

      {/* Phase indicators */}
      <div className="flex gap-2">
        <PhaseIndicator 
          label="Questions" 
          isActive={elapsedSeconds >= TIME_ESTIMATES.overhead && elapsedSeconds < TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion)}
          isComplete={elapsedSeconds >= TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion)}
        />
        {includeSvg && (
          <PhaseIndicator 
            label="Diagrams" 
            isActive={elapsedSeconds >= TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion)}
            isComplete={elapsedSeconds >= TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion) + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5)}
          />
        )}
        {includeImages && (
          <PhaseIndicator 
            label="Images" 
            isActive={!includeSvg 
              ? elapsedSeconds >= TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion)
              : elapsedSeconds >= TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion) + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5)
            }
            isComplete={false}
          />
        )}
      </div>
    </div>
  );
}

function PhaseIndicator({ label, isActive, isComplete }: { label: string; isActive: boolean; isComplete: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
      isComplete 
        ? 'bg-green-500/10 text-green-600' 
        : isActive 
          ? 'bg-primary/10 text-primary' 
          : 'bg-muted text-muted-foreground'
    }`}>
      {isComplete ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : isActive ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <div className="h-3 w-3 rounded-full border border-current" />
      )}
      {label}
    </div>
  );
}
