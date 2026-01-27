import { Clock, Zap, Image, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GenerationTimeEstimatorProps {
  questionCount: number;
  includeImages: boolean;
  includeSvg?: boolean;
}

// Time estimates in seconds
const TIME_ESTIMATES = {
  basePerQuestion: 2, // Base time per question (text only)
  imagePerQuestion: 8, // Additional time for AI image generation
  svgPerQuestion: 3, // Additional time for SVG diagram generation
  overhead: 3, // Network/processing overhead
};

export function GenerationTimeEstimator({
  questionCount,
  includeImages,
  includeSvg = true,
}: GenerationTimeEstimatorProps) {
  // Calculate estimates for different scenarios
  const textOnlyTime = TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion);
  const withSvgTime = textOnlyTime + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5); // ~50% need diagrams
  const withImagesTime = textOnlyTime + (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3); // ~30% need images
  const fullTime = textOnlyTime + 
    (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5) + 
    (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3);

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `~${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `~${minutes}m ${remainingSeconds}s` : `~${minutes}m`;
  };

  // Current estimated time based on settings
  const currentEstimate = includeImages 
    ? (includeSvg ? fullTime : withImagesTime)
    : (includeSvg ? withSvgTime : textOnlyTime);

  return (
    <div className="p-3 rounded-lg bg-muted/30 border space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-muted-foreground" />
        Estimated Generation Time
      </div>
      
      {/* Current estimate highlight */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-sm px-3 py-1">
          <Zap className="h-3 w-3 mr-1" />
          {formatTime(currentEstimate)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          for {questionCount} questions
        </span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`flex items-center gap-2 p-2 rounded ${!includeImages && !includeSvg ? 'bg-primary/10 border border-primary/30' : 'bg-background'}`}>
          <FileText className="h-3 w-3 text-muted-foreground" />
          <div>
            <div className="font-medium">Text Only</div>
            <div className="text-muted-foreground">{formatTime(textOnlyTime)}</div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 p-2 rounded ${!includeImages && includeSvg ? 'bg-primary/10 border border-primary/30' : 'bg-background'}`}>
          <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          </svg>
          <div>
            <div className="font-medium">+ Geometry</div>
            <div className="text-muted-foreground">{formatTime(withSvgTime)}</div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 p-2 rounded ${includeImages && !includeSvg ? 'bg-primary/10 border border-primary/30' : 'bg-background'}`}>
          <Image className="h-3 w-3 text-muted-foreground" />
          <div>
            <div className="font-medium">+ AI Images</div>
            <div className="text-muted-foreground">{formatTime(withImagesTime)}</div>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 p-2 rounded ${includeImages && includeSvg ? 'bg-primary/10 border border-primary/30' : 'bg-background'}`}>
          <Zap className="h-3 w-3 text-muted-foreground" />
          <div>
            <div className="font-medium">Full (All)</div>
            <div className="text-muted-foreground">{formatTime(fullTime)}</div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Times vary based on complexity. Text-only is fastest for quick reviews.
      </p>
    </div>
  );
}
