import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Move, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorRegion {
  id: number;
  vertical: 'top' | 'middle' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
  text: string;
  // Custom position/size overrides (percentages)
  customX?: number;
  customY?: number;
  customWidth?: number;
  customHeight?: number;
}

interface ImageErrorOverlayProps {
  errorRegions: ErrorRegion[];
  highlightedError: number | null;
  onErrorHover?: (id: number | null) => void;
  onErrorClick?: (id: number) => void;
  onRegionUpdate?: (id: number, updates: Partial<ErrorRegion>) => void;
  zoom?: number;
  rotation?: number;
  isEditing?: boolean;
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
 * Converts error regions to overlay positions (percentages) - smaller default sizes
 */
function getRegionPosition(vertical: ErrorRegion['vertical'], horizontal: ErrorRegion['horizontal']) {
  // Smaller regions - 15% instead of 28%
  const verticalMap = {
    top: { top: 8, height: 15 },
    middle: { top: 42, height: 15 },
    bottom: { top: 76, height: 15 },
  };

  const horizontalMap = {
    left: { left: 8, width: 15 },
    center: { left: 42, width: 15 },
    right: { left: 76, width: 15 },
  };

  return {
    ...verticalMap[vertical],
    ...horizontalMap[horizontal],
  };
}

function DraggableResizableRegion({
  region,
  isHighlighted,
  isAnimating,
  isEditing,
  onHover,
  onClick,
  onUpdate,
  containerRef,
}: {
  region: ErrorRegion;
  isHighlighted: boolean;
  isAnimating: boolean;
  isEditing: boolean;
  onHover: (id: number | null) => void;
  onClick: (id: number) => void;
  onUpdate?: (id: number, updates: Partial<ErrorRegion>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get position - use custom if available, otherwise default
  const defaultPos = getRegionPosition(region.vertical, region.horizontal);
  const x = region.customX ?? defaultPos.left;
  const y = region.customY ?? defaultPos.top;
  const width = region.customWidth ?? defaultPos.width;
  const height = region.customHeight ?? defaultPos.height;

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!isEditing || !containerRef.current || !onUpdate) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = x;
    const startPosY = y;
    const startWidth = width;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100;

      if (type === 'drag') {
        const newX = Math.max(0, Math.min(100 - width, startPosX + deltaX));
        const newY = Math.max(0, Math.min(100 - height, startPosY + deltaY));
        onUpdate(region.id, { customX: newX, customY: newY });
      } else {
        const newWidth = Math.max(5, Math.min(50, startWidth + deltaX));
        const newHeight = Math.max(5, Math.min(50, startHeight + deltaY));
        onUpdate(region.id, { customWidth: newWidth, customHeight: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEditing, containerRef, onUpdate, region.id, x, y, width, height]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'drag' | 'resize') => {
    if (!isEditing || !containerRef.current || !onUpdate) return;
    
    e.stopPropagation();
    
    if (type === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(true);
    }

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const startPosX = x;
    const startPosY = y;
    const startWidth = width;
    const startHeight = height;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      const deltaX = ((moveTouch.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((moveTouch.clientY - startY) / containerRect.height) * 100;

      if (type === 'drag') {
        const newX = Math.max(0, Math.min(100 - width, startPosX + deltaX));
        const newY = Math.max(0, Math.min(100 - height, startPosY + deltaY));
        onUpdate(region.id, { customX: newX, customY: newY });
      } else {
        const newWidth = Math.max(5, Math.min(50, startWidth + deltaX));
        const newHeight = Math.max(5, Math.min(50, startHeight + deltaY));
        onUpdate(region.id, { customWidth: newWidth, customHeight: newHeight });
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [isEditing, containerRef, onUpdate, region.id, x, y, width, height]);

  return (
    <div
      ref={elementRef}
      className={cn(
        "absolute rounded-lg border-2 transition-all duration-200",
        isDragging || isResizing ? "z-50" : "z-10",
        isHighlighted
          ? "border-destructive bg-destructive/20 shadow-lg shadow-destructive/30"
          : "border-amber-500/70 bg-amber-500/15 hover:border-amber-500 hover:bg-amber-500/25",
        isAnimating && "animate-pulse",
        isEditing && "cursor-move"
      )}
      style={{
        top: `${y}%`,
        left: `${x}%`,
        width: `${width}%`,
        height: `${height}%`,
      }}
      onMouseEnter={() => {
        onHover(region.id);
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        onHover(null);
        setShowTooltip(false);
      }}
      onClick={() => onClick(region.id)}
    >
      {/* Drag handle - visible in edit mode */}
      {isEditing && (
        <div
          className="absolute inset-0 cursor-move flex items-center justify-center"
          onMouseDown={(e) => handleMouseDown(e, 'drag')}
          onTouchStart={(e) => handleTouchStart(e, 'drag')}
        >
          <Move className={cn(
            "h-4 w-4 opacity-50 transition-opacity",
            isDragging ? "opacity-100 text-primary" : "hover:opacity-100"
          )} />
        </div>
      )}

      {/* Error number badge */}
      <div
        className={cn(
          "absolute -top-2 -left-2 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all shadow-sm",
          isHighlighted
            ? "bg-destructive text-destructive-foreground scale-110"
            : "bg-amber-500 text-white"
        )}
      >
        {region.id}
      </div>

      {/* Resize handle - bottom right corner */}
      {isEditing && (
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-sm cursor-se-resize flex items-center justify-center transition-colors",
            isResizing ? "bg-primary" : "bg-muted-foreground/50 hover:bg-primary"
          )}
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
          onTouchStart={(e) => handleTouchStart(e, 'resize')}
        >
          <Maximize2 className="h-2.5 w-2.5 text-white rotate-90" />
        </div>
      )}

      {/* Hover tooltip - only show when not editing and highlighted */}
      {showTooltip && isHighlighted && !isEditing && (
        <div className="absolute top-full left-0 mt-2 z-50 max-w-xs p-2 bg-popover border rounded-md shadow-lg text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
            <p className="text-popover-foreground line-clamp-3">{region.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageErrorOverlay({
  errorRegions,
  highlightedError,
  onErrorHover,
  onErrorClick,
  onRegionUpdate,
  zoom = 1,
  rotation = 0,
  isEditing = false,
}: ImageErrorOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {errorRegions.map((region) => {
        const isHighlighted = highlightedError === region.id;
        const isAnimating = animatingId === region.id;

        return (
          <div key={region.id} className="pointer-events-auto">
            <DraggableResizableRegion
              region={region}
              isHighlighted={isHighlighted}
              isAnimating={isAnimating}
              isEditing={isEditing}
              onHover={onErrorHover || (() => {})}
              onClick={onErrorClick || (() => {})}
              onUpdate={onRegionUpdate}
              containerRef={containerRef}
            />
          </div>
        );
      })}
    </div>
  );
}
