/**
 * Standalone utility for extracting error regions from misconception strings.
 *
 * This file exists to break the module-initialisation chain that previously
 * caused Temporal Dead Zone (TDZ) crashes in production bundles.
 *
 * Before this change, `StudentWorkDetailDialog`, `BatchImageZoomDialog` and
 * `GradedPapersGallery` all eagerly imported `extractErrorRegions` from
 * `MisconceptionComparison.tsx`.  Because that file in turn imports UI
 * components that share a chunk with the importers, the bundler could
 * evaluate a `const` before its declaration – the classic TDZ crash
 * ("Cannot access 'Kt' before initialization").
 *
 * By moving the pure-logic helpers here (no React / UI imports), the cycle
 * is broken and imports resolve safely.
 */

import { parseErrorLocation, type ErrorRegion } from './ImageErrorOverlay';

interface ParsedMisconception {
  id: number;
  studentWrote: string;
  expectedAnswer: string;
  impact: string;
  fullText: string;
  location: ErrorRegion | null;
}

/**
 * Parses a misconception string to extract the student's work vs expected answer.
 * Duplicated from MisconceptionComparison so this file has zero React imports.
 */
function parseMisconception(text: string, index: number): ParsedMisconception {
  const { location, horizontal, cleanText } = parseErrorLocation(text);

  const result: ParsedMisconception = {
    id: index + 1,
    studentWrote: '',
    expectedAnswer: '',
    impact: '',
    fullText: cleanText,
    location:
      location && horizontal
        ? { id: index + 1, vertical: location, horizontal, text: cleanText }
        : null,
  };

  // Pattern 1: Look for quoted student work
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

  // Fallback
  if (!result.studentWrote && !result.expectedAnswer) {
    const anyQuote = cleanText.match(/['"]([^'"]{3,})['"]/);
    if (anyQuote) {
      result.studentWrote = anyQuote[1];
    }
    const shouldMatch = cleanText.match(/should\s+(?:have\s+)?(?:been\s+)?([^.]+)/i);
    if (shouldMatch) {
      result.expectedAnswer = shouldMatch[1].trim();
    }
  }

  return result;
}

/**
 * Extracts error regions from misconceptions for use with ImageErrorOverlay.
 */
export function extractErrorRegions(misconceptions: string[]): ErrorRegion[] {
  return misconceptions
    .map((m, i) => {
      const parsed = parseMisconception(m, i);
      return parsed.location;
    })
    .filter((loc): loc is ErrorRegion => loc !== null);
}
