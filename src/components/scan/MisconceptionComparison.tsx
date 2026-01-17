import { X, Check, ArrowRight, AlertTriangle, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ParsedMisconception {
  studentWrote: string;
  expectedAnswer: string;
  impact: string;
  fullText: string;
}

interface MisconceptionComparisonProps {
  misconceptions: string[];
}

/**
 * Parses a misconception string to extract the student's work vs expected answer
 * Expected format from AI: "The student wrote '[quote]' when... The correct approach would be [expected]. This error resulted in [impact]."
 */
function parseMisconception(text: string): ParsedMisconception {
  const result: ParsedMisconception = {
    studentWrote: '',
    expectedAnswer: '',
    impact: '',
    fullText: text,
  };

  // Pattern 1: Look for quoted student work with 'wrote', 'used', 'calculated', etc.
  const wrotePatterns = [
    /(?:student|they)\s+(?:wrote|used|calculated|had|gave|put|entered|wrote down)\s+['"]([^'"]+)['"]/i,
    /(?:student|they)\s+(?:wrote|used|calculated|had|gave|put|entered)\s+([^.]+?)(?:\s+(?:instead|when|but|however|rather))/i,
    /['"]([^'"]{3,50})['"]\s+(?:instead of|when|but)/i,
  ];

  for (const pattern of wrotePatterns) {
    const match = text.match(pattern);
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
    const match = text.match(pattern);
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
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      result.impact = match[1].trim();
      break;
    }
  }

  // Fallback: If we couldn't parse structured data, try to split by common keywords
  if (!result.studentWrote && !result.expectedAnswer) {
    // Try to find any quoted text as student work
    const anyQuote = text.match(/['"]([^'"]{3,})['"]/);
    if (anyQuote) {
      result.studentWrote = anyQuote[1];
    }

    // Look for "should" or "correct" for expected
    const shouldMatch = text.match(/should\s+(?:have\s+)?(?:been\s+)?([^.]+)/i);
    if (shouldMatch) {
      result.expectedAnswer = shouldMatch[1].trim();
    }
  }

  return result;
}

export function MisconceptionComparison({ misconceptions }: MisconceptionComparisonProps) {
  if (misconceptions.length === 0) return null;

  const parsedMisconceptions = misconceptions.map(parseMisconception);
  const hasStructuredData = parsedMisconceptions.some(m => m.studentWrote || m.expectedAnswer);

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Identified Misconceptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parsedMisconceptions.map((misconception, i) => {
          const hasComparison = misconception.studentWrote || misconception.expectedAnswer;

          return (
            <div key={i} className="space-y-2">
              {hasComparison ? (
                // Side-by-side comparison view
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* What Student Wrote - Red/Wrong side */}
                  <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-3 relative">
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
                  <div className="rounded-lg border-2 border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 relative">
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
                <div className="bg-muted/50 rounded-md p-3 border-l-2 border-amber-400">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {misconception.fullText}
                  </p>
                </div>
              )}

              {/* Separator between misconceptions */}
              {i < parsedMisconceptions.length - 1 && (
                <div className="border-t border-amber-200/50 dark:border-amber-800/50 pt-2" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
