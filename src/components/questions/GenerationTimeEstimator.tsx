import { Clock, Zap, Image, FileText, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GenerationTimeEstimatorProps {
  questionCount: number;
  includeImages: boolean;
  includeSvg?: boolean;
  /** Number of students/sheets in the class set. If > 1, shows class set calculations */
  studentCount?: number;
}

// Time estimates in seconds - optimized for realistic generation times
// Target: most generations complete in under 5 minutes, max ~10 minutes
const TIME_ESTIMATES = {
  basePerQuestion: 0.8, // Base time per question (text only) - AI is fast
  imagePerQuestion: 2, // Additional time for AI image generation
  svgPerQuestion: 1, // Additional time for SVG diagram generation  
  overhead: 2, // Network/processing overhead
  overheadPerSheet: 0.1, // Minimal overhead per student sheet (cached per level)
};

export function GenerationTimeEstimator({
  questionCount,
  includeImages,
  includeSvg = true,
  studentCount = 1,
}: GenerationTimeEstimatorProps) {
  const isClassSet = studentCount > 1;
  const sheetsToGenerate = studentCount;
  
  // Calculate estimates for a single sheet
  const singleSheetTextTime = TIME_ESTIMATES.overhead + (questionCount * TIME_ESTIMATES.basePerQuestion);
  const singleSheetSvgTime = singleSheetTextTime + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5);
  const singleSheetImageTime = singleSheetTextTime + (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3);
  const singleSheetFullTime = singleSheetTextTime + 
    (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5) + 
    (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3);

  // For class sets, questions are generated per-level (cached), not per-student
  // So the main generation time doesn't scale linearly with students
  // Estimate ~6 unique levels, so generation is roughly 6x single sheet for questions
  const uniqueLevels = Math.min(sheetsToGenerate, 6);
  const classSetOverhead = TIME_ESTIMATES.overhead + (sheetsToGenerate * TIME_ESTIMATES.overheadPerSheet);
  
  // Class set time estimates (generation is per-level, not per-student)
  const classSetTextTime = classSetOverhead + (questionCount * TIME_ESTIMATES.basePerQuestion * uniqueLevels);
  const classSetSvgTime = classSetTextTime + (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5 * uniqueLevels);
  const classSetImageTime = classSetTextTime + (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3 * uniqueLevels);
  const classSetFullTime = classSetTextTime + 
    (questionCount * TIME_ESTIMATES.svgPerQuestion * 0.5 * uniqueLevels) + 
    (questionCount * TIME_ESTIMATES.imagePerQuestion * 0.3 * uniqueLevels);

  // Use class set times if applicable
  const textOnlyTime = isClassSet ? classSetTextTime : singleSheetTextTime;
  const withSvgTime = isClassSet ? classSetSvgTime : singleSheetSvgTime;
  const withImagesTime = isClassSet ? classSetImageTime : singleSheetImageTime;
  const fullTime = isClassSet ? classSetFullTime : singleSheetFullTime;

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
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default" className="text-sm px-3 py-1">
          <Zap className="h-3 w-3 mr-1" />
          {formatTime(currentEstimate)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isClassSet ? (
            <>for <strong>{sheetsToGenerate} student sheets</strong> ({questionCount} questions each)</>
          ) : (
            <>for {questionCount} questions</>
          )}
        </span>
      </div>

      {/* Class set info */}
      {isClassSet && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded">
          <Users className="h-3 w-3" />
          <span>
            Generating differentiated worksheets for {sheetsToGenerate} students 
            (questions cached per difficulty level)
          </span>
        </div>
      )}

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
        {isClassSet 
          ? 'Class set generation caches questions per level. Times vary based on complexity.'
          : 'Times vary based on complexity. Text-only is fastest for quick reviews.'}
      </p>
    </div>
  );
}
