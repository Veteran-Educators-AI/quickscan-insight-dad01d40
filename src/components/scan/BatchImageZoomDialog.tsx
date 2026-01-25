import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Move, X, AlertTriangle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageErrorOverlay, ErrorRegion } from './ImageErrorOverlay';
import { extractErrorRegions } from './MisconceptionComparison';
import { cn } from '@/lib/utils';

interface BatchImageZoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  studentName: string;
  paperIndex: number;
  totalPapers: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
  misconceptions?: string[];
  grade?: number;
}

export function BatchImageZoomDialog({
  open,
  onOpenChange,
  imageUrl,
  studentName,
  paperIndex,
  totalPapers,
  onNavigate,
  misconceptions = [],
  grade,
}: BatchImageZoomDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [highlightedError, setHighlightedError] = useState<number | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract error regions from misconceptions
  const errorRegions = extractErrorRegions(misconceptions);

  // Reset view when image changes
  useEffect(() => {
    resetView();
    setHighlightedError(null);
  }, [imageUrl]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && onNavigate && paperIndex > 0) {
      onNavigate('prev');
    } else if (e.key === 'ArrowRight' && onNavigate && paperIndex < totalPapers - 1) {
      onNavigate('next');
    } else if (e.key === '+' || e.key === '=') {
      handleZoomIn();
    } else if (e.key === '-') {
      handleZoomOut();
    } else if (e.key === 'r') {
      handleRotate();
    } else if (e.key === '0') {
      resetView();
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      setIsPanning(true);
      setStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1 && zoom > 1) {
      setPosition({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - startPos.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const getGradeColor = (g: number) => {
    if (g >= 90) return 'bg-green-500';
    if (g >= 80) return 'bg-blue-500';
    if (g >= 70) return 'bg-yellow-500';
    if (g >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const hasMisconceptions = misconceptions.length > 0;
  const hasAnnotatableErrors = errorRegions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="p-3 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            Paper {paperIndex + 1} of {totalPapers}
            {studentName && ` • ${studentName}`}
            {grade !== undefined && (
              <Badge className={cn("ml-2", getGradeColor(grade))}>
                {grade}%
              </Badge>
            )}
          </DialogTitle>
          <div className="flex items-center gap-1">
            {/* Toggle annotations */}
            {hasMisconceptions && (
              <Button
                variant={showAnnotations ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
                className="h-7 px-2 gap-1 mr-2"
              >
                <AlertTriangle className="h-3 w-3" />
                {showAnnotations ? 'Hide' : 'Show'} Errors
              </Button>
            )}

            {/* Navigation */}
            {onNavigate && (
              <div className="flex items-center gap-1 mr-2 border-r pr-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('prev')}
                  disabled={paperIndex === 0}
                  className="h-7 px-2"
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('next')}
                  disabled={paperIndex >= totalPapers - 1}
                  className="h-7 px-2"
                >
                  Next →
                </Button>
              </div>
            )}
            
            {/* Zoom controls */}
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoom <= 0.25}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoom >= 5}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleRotate}>
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetView}>
              Reset
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[70vh]">
          {/* Main image area */}
          <div
            ref={containerRef}
            className={cn(
              "relative overflow-hidden bg-muted/30 flex-1",
              zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in',
              isPanning && 'cursor-grabbing'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              if (zoom === 1) handleZoomIn();
            }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
            >
              {/* Image container with relative positioning for overlay */}
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt={`Student work - ${studentName}`}
                  className="max-h-full max-w-full object-contain select-none"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                  }}
                  draggable={false}
                />
                
                {/* Error region overlay */}
                {showAnnotations && hasAnnotatableErrors && (
                  <ImageErrorOverlay
                    errorRegions={errorRegions}
                    highlightedError={highlightedError}
                    onErrorHover={setHighlightedError}
                    onErrorClick={(id) => setHighlightedError(id === highlightedError ? null : id)}
                    zoom={zoom}
                    rotation={rotation}
                  />
                )}
              </div>
            </div>

            {/* Zoom hint overlay */}
            {zoom === 1 && !hasMisconceptions && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-muted-foreground flex items-center gap-2">
                <Move className="h-3 w-3" />
                Click or scroll to zoom • Drag to pan when zoomed
              </div>
            )}

            {/* Annotation legend when showing errors */}
            {showAnnotations && hasAnnotatableErrors && zoom === 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs flex items-center gap-3 border shadow-lg">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-500/20" />
                  <span className="text-muted-foreground">Error location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded border-2 border-destructive bg-destructive/20" />
                  <span className="text-muted-foreground">Selected error</span>
                </div>
                <span className="text-muted-foreground">• Click to highlight</span>
              </div>
            )}
          </div>

          {/* Sidebar - Misconceptions list */}
          {hasMisconceptions && showAnnotations && (
            <div className="w-80 border-l bg-background flex flex-col">
              <div className="p-3 border-b bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Errors Found ({misconceptions.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Click an error to highlight it on the image
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {misconceptions.map((m, i) => {
                    const errorNum = i + 1;
                    const region = errorRegions.find(r => r.id === errorNum);
                    const isHighlighted = highlightedError === errorNum;
                    
                    // Parse out the location prefix if present
                    const cleanText = m.replace(/^ERROR_LOCATION:\s*\w+-\w+\s*\|\s*/i, '');

                    return (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          isHighlighted
                            ? "border-destructive bg-destructive/10 shadow-md"
                            : "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
                        )}
                        onMouseEnter={() => setHighlightedError(errorNum)}
                        onMouseLeave={() => setHighlightedError(null)}
                        onClick={() => setHighlightedError(isHighlighted ? null : errorNum)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
                            isHighlighted
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-amber-500 text-white"
                          )}>
                            {errorNum}
                          </div>
                          <div className="flex-1 min-w-0">
                            {region && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] mb-1.5",
                                  isHighlighted 
                                    ? "border-destructive text-destructive"
                                    : "border-amber-400 text-amber-700 dark:text-amber-300"
                                )}
                              >
                                <MapPin className="h-2.5 w-2.5 mr-1" />
                                {region.vertical}-{region.horizontal}
                              </Badge>
                            )}
                            <p className="text-xs leading-relaxed text-foreground/80">
                              {cleanText}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          <span className="mr-4">← → Navigate papers</span>
          <span className="mr-4">+ - Zoom</span>
          <span className="mr-4">R Rotate</span>
          <span>0 Reset</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
