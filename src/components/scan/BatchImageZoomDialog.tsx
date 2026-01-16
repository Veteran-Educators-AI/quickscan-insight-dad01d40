import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Move, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BatchImageZoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  studentName: string;
  paperIndex: number;
  totalPapers: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function BatchImageZoomDialog({
  open,
  onOpenChange,
  imageUrl,
  studentName,
  paperIndex,
  totalPapers,
  onNavigate,
}: BatchImageZoomDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view when image changes
  useEffect(() => {
    resetView();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="p-3 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm font-medium">
            Paper {paperIndex + 1} of {totalPapers}
            {studentName && ` • ${studentName}`}
          </DialogTitle>
          <div className="flex items-center gap-1">
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

        <div
          ref={containerRef}
          className={`relative overflow-hidden bg-muted/30 h-[70vh] ${
            zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'
          } ${isPanning ? 'cursor-grabbing' : ''}`}
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
          </div>

          {/* Zoom hint overlay */}
          {zoom === 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-muted-foreground flex items-center gap-2">
              <Move className="h-3 w-3" />
              Click or scroll to zoom • Drag to pan when zoomed
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
