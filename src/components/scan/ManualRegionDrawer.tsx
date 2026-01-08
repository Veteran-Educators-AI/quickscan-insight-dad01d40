import { useState, useRef, useEffect, useCallback } from 'react';
import { Square, Trash2, Check, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ManualRegionDrawerProps {
  imageUrl: string;
  onRegionsConfirm: (regions: Region[], croppedImages: string[]) => void;
  onCancel: () => void;
}

export function ManualRegionDrawer({ imageUrl, onRegionsConfirm, onCancel }: ManualRegionDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [regions, setRegions] = useState<Region[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // Calculate initial scale to fit container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const containerHeight = 400;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = imageDimensions.width * scale;
    canvas.height = imageDimensions.height * scale;

    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

    // Draw regions
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';

    regions.forEach((region, index) => {
      const x = region.x * scale;
      const y = region.y * scale;
      const w = region.width * scale;
      const h = region.height * scale;
      
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      
      // Draw label
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${index + 1}`, x + 4, y + 16);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    });

    // Draw current region being drawn
    if (currentRegion) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      const x = currentRegion.x * scale;
      const y = currentRegion.y * scale;
      const w = currentRegion.width * scale;
      const h = currentRegion.height * scale;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
  }, [regions, currentRegion, scale, imageLoaded, imageDimensions]);

  const getMousePosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(e);
    setIsDrawing(true);
    setCurrentRegion({
      id: `region-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  }, [getMousePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentRegion) return;
    const pos = getMousePosition(e);
    setCurrentRegion(prev => prev ? {
      ...prev,
      width: pos.x - prev.x,
      height: pos.y - prev.y,
    } : null);
  }, [isDrawing, currentRegion, getMousePosition]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentRegion) return;
    
    // Normalize negative dimensions
    let finalRegion = { ...currentRegion };
    if (finalRegion.width < 0) {
      finalRegion.x += finalRegion.width;
      finalRegion.width = Math.abs(finalRegion.width);
    }
    if (finalRegion.height < 0) {
      finalRegion.y += finalRegion.height;
      finalRegion.height = Math.abs(finalRegion.height);
    }
    
    // Only add if region is big enough
    if (finalRegion.width > 20 && finalRegion.height > 20) {
      setRegions(prev => [...prev, finalRegion]);
    }
    
    setIsDrawing(false);
    setCurrentRegion(null);
  }, [isDrawing, currentRegion]);

  const removeRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const handleConfirm = async () => {
    if (regions.length === 0 || !imageRef.current) return;

    // Crop each region from the original image
    const croppedImages: string[] = [];
    
    for (const region of regions) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = region.width;
      cropCanvas.height = region.height;
      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          imageRef.current,
          region.x, region.y, region.width, region.height,
          0, 0, region.width, region.height
        );
        croppedImages.push(cropCanvas.toDataURL('image/jpeg', 0.9));
      }
    }

    onRegionsConfirm(regions, croppedImages);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Draw Student Regions</h3>
          <Badge variant="secondary">{regions.length} regions</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Click and drag to draw boxes around each student's work area.
      </p>

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-auto bg-muted/50 max-h-[450px]"
      >
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair"
          />
        ) : (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">Loading image...</p>
          </div>
        )}
      </div>

      {/* Region List */}
      {regions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {regions.map((region, index) => (
            <Badge key={region.id} variant="outline" className="gap-1">
              Region {index + 1}
              <button 
                onClick={() => removeRegion(region.id)}
                className="ml-1 text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="default" 
          onClick={handleConfirm}
          disabled={regions.length === 0}
        >
          <Check className="h-4 w-4 mr-2" />
          Confirm {regions.length} Region{regions.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
