import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorRegion {
  id: number;
  vertical: 'top' | 'middle' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
  text: string;
}

interface ImageErrorOverlayProps {
  errorRegions: ErrorRegion[];
  highlightedError: number | null;
  onErrorHover?: (id: number | null) => void;
  onErrorClick?: (id: number) => void;
  zoom?: number;
  rotation?: number;
}

/**
 * Parses error location from misconception text
 * Expected format: "ERROR_LOCATION: top-right | The student..."
 */
export function parseErrorLocation(text: string): { location: ErrorRegion['vertical'] | null; horizontal: ErrorRegion['horizontal'] | null; cleanText: string } {
  const locationMatch = text.match(/^ERROR_LOCATION:\s*(\w+)-(\w+)\s*\|\s*/i);
  
  if (!locationMatch) {
    return { location: null, horizontal: null, cleanText: text };
  }

  const vertical = locationMatch[1].toLowerCase() as ErrorRegion['vertical'];
  const horizontal = locationMatch[2].toLowerCase() as ErrorRegion['horizontal'];
  const cleanText = text.replace(/^ERROR_LOCATION:\s*\w+-\w+\s*\|\s*/i, '');

  // Validate the values
  const validVertical = ['top', 'middle', 'bottom'].includes(vertical) ? vertical : 'middle';
  const validHorizontal = ['left', 'center', 'right'].includes(horizontal) ? horizontal : 'center';

  return {
    location: validVertical as ErrorRegion['vertical'],
    horizontal: validHorizontal as ErrorRegion['horizontal'],
    cleanText,
  };
}

/**
 * Converts error regions to overlay positions (percentages)
 */
function getRegionPosition(vertical: ErrorRegion['vertical'], horizontal: ErrorRegion['horizontal']) {
  const verticalMap = {
    top: { top: '5%', height: '28%' },
    middle: { top: '36%', height: '28%' },
    bottom: { top: '67%', height: '28%' },
  };

  const horizontalMap = {
    left: { left: '5%', width: '28%' },
    center: { left: '36%', width: '28%' },
    right: { left: '67%', width: '28%' },
  };

  return {
    ...verticalMap[vertical],
    ...horizontalMap[horizontal],
  };
}

export function ImageErrorOverlay({
  errorRegions,
  highlightedError,
  onErrorHover,
  onErrorClick,
  zoom = 1,
  rotation = 0,
}: ImageErrorOverlayProps) {
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  // Trigger pulse animation when highlighted error changes
  useEffect(() => {
    if (highlightedError !== null) {
      setAnimatingId(highlightedError);
      const timer = setTimeout(() => setAnimatingId(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightedError]);

  if (errorRegions.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {errorRegions.map((region) => {
        const position = getRegionPosition(region.vertical, region.horizontal);
        const isHighlighted = highlightedError === region.id;
        const isAnimating = animatingId === region.id;

        return (
          <div
            key={region.id}
            className={cn(
              "absolute rounded-lg border-2 transition-all duration-300 pointer-events-auto cursor-pointer",
              isHighlighted
                ? "border-destructive bg-destructive/20 shadow-lg shadow-destructive/30"
                : "border-amber-500/50 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20",
              isAnimating && "animate-pulse"
            )}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              height: position.height,
            }}
            onMouseEnter={() => onErrorHover?.(region.id)}
            onMouseLeave={() => onErrorHover?.(null)}
            onClick={() => onErrorClick?.(region.id)}
          >
            {/* Error number badge */}
            <div
              className={cn(
                "absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
                isHighlighted
                  ? "bg-destructive text-destructive-foreground scale-110"
                  : "bg-amber-500 text-white"
              )}
            >
              {region.id}
            </div>

            {/* Hover tooltip */}
            {isHighlighted && (
              <div className="absolute top-full left-0 mt-2 z-50 max-w-xs p-2 bg-popover border rounded-md shadow-lg text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                  <p className="text-popover-foreground line-clamp-3">{region.text}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
