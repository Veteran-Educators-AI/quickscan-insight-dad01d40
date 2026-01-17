import { useState } from 'react';
import { X, Check, ArrowRight, AlertTriangle, Quote, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { parseErrorLocation, ErrorRegion } from './ImageErrorOverlay';

interface ParsedMisconception {
  id: number;
  studentWrote: string;
  expectedAnswer: string;
  impact: string;
  fullText: string;
  location: ErrorRegion | null;
}

interface MisconceptionComparisonProps {
  misconceptions: string[];
  highlightedError?: number | null;
  onErrorHover?: (id: number | null) => void;
  onErrorClick?: (id: number) => void;
}

/**
 * Parses a misconception string to extract the student's work vs expected answer
 * Expected format from AI: "ERROR_LOCATION: top-right | The student wrote '[quote]' when... The correct approach would be [expected]. This error resulted in [impact]."
 */
function parseMisconception(text: string, index: number): ParsedMisconception {
  // First parse the location
  const { location, horizontal, cleanText } = parseErrorLocation(text);
  
  const result: ParsedMisconception = {
    id: index + 1,
    studentWrote: '',
    expectedAnswer: '',
    impact: '',
    fullText: cleanText,
    location: location && horizontal ? { id: index + 1, vertical: location, horizontal, text: cleanText } : null,
  };

  // Pattern 1: Look for quoted student work with 'wrote', 'used', 'calculated', etc.
  const wrotePatterns = [
    /(?:student|they)\s+(?:wrote|used|calculated|had|gave|put|entered|wrote down)\s+['"]([^'"]+)['"]/i,
    /(?:student|they)\s+(?:wrote|used|calculated|had|gave|put|entered)\s+([^.]+?)(?:\s+(?:instead|when|but|however|rather))/i,
    /['"]([^'"]{3,50})['"]\s+(?:instead of|when|but)/i,
  ];

  for (const pattern of wrotePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      result.studentWrote = match[1].trim();
      break;
    }
  }

  // Pattern 2: Look for correct/expected answer
  const expectedPatterns = [
    /(?:correct|expected|should (?:have )?be(?:en)?|should have|was supposed to be|proper)\s+(?:answer|approach|solution|formula|calculation|value|result)?\s*(?:is|was|would be|should be)?\s*['"]?([^.'"]+?)['"]?(?:\.|,|$)/i,
    /instead of\s+['"]?([^.'"]+?)['"]?(?:\.|,|$)/i,
    /(?:should be|expected)\s+['"]?([^.'"]+?)['"]?(?:\.|,|$)/i,
    /(?:The correct|Expected)\s+(?:answer|solution|approach|formula|value)?\s*(?:is|was|:)?\s*['"]?([^.'"]+?)['"]?(?:\.|,|$)/i,
  ];

  for (const pattern of expectedPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      result.expectedAnswer = match[1].trim();
      break;
    }
  }

  // Pattern 3: Look for impact/consequence
  const impactPatterns = [
    /(?:This|Which|That)\s+(?:error|mistake|caused|resulted|led|gave)\s+(?:in|to)?\s*['"]?([^.]+?)['"]?(?:\.|$)/i,
    /(?:resulting|leading|causing)\s+(?:in|to)\s+['"]?([^.]+?)['"]?(?:\.|$)/i,
    /(?:gave|produced|yielded)\s+(?:a|an|the)?\s*(?:final|wrong|incorrect)?\s*(?:answer|result|value)?\s*(?:of)?\s*['"]?([^.]+?)['"]?(?:\.|$)/i,
  ];

  for (const pattern of impactPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      result.impact = match[1].trim();
      break;
    }
  }

  // Fallback: If we couldn't parse structured data, try to split by common keywords
  if (!result.studentWrote && !result.expectedAnswer) {
    // Try to find any quoted text as student work
    const anyQuote = cleanText.match(/['"]([^'"]{3,})['"]/);
    if (anyQuote) {
      result.studentWrote = anyQuote[1];
    }

    // Look for "should" or "correct" for expected
    const shouldMatch = cleanText.match(/should\s+(?:have\s+)?(?:been\s+)?([^.]+)/i);
    if (shouldMatch) {
      result.expectedAnswer = shouldMatch[1].trim();
    }
  }

  return result;
}

/**
 * Extracts error regions from misconceptions for use with ImageErrorOverlay
 */
export function extractErrorRegions(misconceptions: string[]): ErrorRegion[] {
  return misconceptions
    .map((m, i) => {
      const parsed = parseMisconception(m, i);
      return parsed.location;
    })
    .filter((loc): loc is ErrorRegion => loc !== null);
}

const locationLabels: Record<string, string> = {
  'top-left': 'Top Left',
  'top-center': 'Top Center',
  'top-right': 'Top Right',
  'middle-left': 'Middle Left',
  'middle-center': 'Middle',
  'middle-right': 'Middle Right',
  'bottom-left': 'Bottom Left',
  'bottom-center': 'Bottom Center',
  'bottom-right': 'Bottom Right',
};

export function MisconceptionComparison({ 
  misconceptions, 
  highlightedError,
  onErrorHover,
  onErrorClick,
}: MisconceptionComparisonProps) {
  const [localHighlight, setLocalHighlight] = useState<number | null>(null);
  
  if (misconceptions.length === 0) return null;

  const parsedMisconceptions = misconceptions.map((m, i) => parseMisconception(m, i));
  const effectiveHighlight = highlightedError ?? localHighlight;

  const handleHover = (id: number | null) => {
    setLocalHighlight(id);
    onErrorHover?.(id);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Identified Misconceptions
          {parsedMisconceptions.some(m => m.location) && (
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              <MapPin className="h-3 w-3 mr-1" />
              Hover to locate on image
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedMisconceptions.map((misconception, i) => {
          const hasComparison = misconception.studentWrote || misconception.expectedAnswer;
          const isHighlighted = effectiveHighlight === misconception.id;

          return (
            <div 
              key={i} 
              className={cn(
                "space-y-2 p-2 -mx-2 rounded-lg transition-all duration-200 cursor-pointer",
                isHighlighted && "bg-amber-100/80 dark:bg-amber-900/30 ring-2 ring-amber-400"
              )}
              onMouseEnter={() => handleHover(misconception.id)}
              onMouseLeave={() => handleHover(null)}
              onClick={() => onErrorClick?.(misconception.id)}
            >
              {/* Error number and location badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
                  isHighlighted
                    ? "bg-destructive text-destructive-foreground scale-110"
                    : "bg-amber-500 text-white"
                )}>
                  {misconception.id}
                </div>
                {misconception.location && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs transition-colors",
                      isHighlighted 
                        ? "border-destructive text-destructive" 
                        : "border-amber-400 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {locationLabels[`${misconception.location.vertical}-${misconception.location.horizontal}`] || 'On page'}
                  </Badge>
                )}
              </div>

              {hasComparison ? (
                // Side-by-side comparison view
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* What Student Wrote - Red/Wrong side */}
                  <div className={cn(
                    "rounded-lg border-2 p-3 relative transition-all",
                    isHighlighted 
                      ? "border-destructive bg-destructive/10" 
                      : "border-destructive/40 bg-destructive/5"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-destructive/20">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                      <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                        Student Wrote
                      </span>
                    </div>
                    {misconception.studentWrote ? (
                      <div className="flex items-start gap-2">
                        <Quote className="h-4 w-4 text-destructive/60 mt-0.5 shrink-0 rotate-180" />
                        <p className="text-sm font-mono text-destructive/90 break-words">
                          {misconception.studentWrote}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive/70 italic">
                        See full explanation below
                      </p>
                    )}
                  </div>

                  {/* What Was Expected - Green/Correct side */}
                  <div className={cn(
                    "rounded-lg border-2 p-3 relative transition-all",
                    isHighlighted 
                      ? "border-emerald-500 bg-emerald-100/50 dark:bg-emerald-900/30" 
                      : "border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <Check className="h-3 w-3 text-emerald-600" />
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        Expected Answer
                      </span>
                    </div>
                    {misconception.expectedAnswer ? (
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-600/60 mt-0.5 shrink-0" />
                        <p className="text-sm font-mono text-emerald-700 dark:text-emerald-300 break-words">
                          {misconception.expectedAnswer}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600/70 italic">
                        See full explanation below
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Impact/Explanation row */}
              {misconception.impact && (
                <div className="flex items-start gap-2 px-1">
                  <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <span className="font-medium">Impact:</span> {misconception.impact}
                  </p>
                </div>
              )}

              {/* Full explanation - always show if no structured data, or as additional context */}
              {(!hasComparison || (hasComparison && !misconception.impact)) && (
                <div className={cn(
                  "rounded-md p-3 border-l-2 transition-all",
                  isHighlighted 
                    ? "bg-amber-100/80 dark:bg-amber-900/40 border-amber-500" 
                    : "bg-muted/50 border-amber-400"
                )}>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {misconception.fullText}
                  </p>
                </div>
              )}

              {/* Separator between misconceptions */}
              {i < parsedMisconceptions.length - 1 && (
                <div className="border-t border-amber-200/50 dark:border-amber-800/50 pt-2 mt-3" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
