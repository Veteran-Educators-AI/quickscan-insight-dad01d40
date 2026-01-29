import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, X, Undo2, Check, Loader2, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageRegionEraserProps {
  imageUrl: string;
  onImageUpdated: (newUrl: string) => void;
  onClose: () => void;
}

export function ImageRegionEraser({ imageUrl, onImageUpdated, onClose }: ImageRegionEraserProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<Region[][]>([]);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getRelativePosition(e.clientX, e.clientY);
    setIsDrawing(true);
    setCurrentRegion({
      id: `region-${Date.now()}`,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  }, [getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentRegion) return;
    const pos = getRelativePosition(e.clientX, e.clientY);
    setCurrentRegion(prev => prev ? {
      ...prev,
      width: pos.x - prev.x,
      height: pos.y - prev.y,
    } : null);
  }, [isDrawing, currentRegion, getRelativePosition]);

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
    
    // Only add if region is big enough (at least 2% of image)
    if (finalRegion.width > 2 && finalRegion.height > 2) {
      setHistory(prev => [...prev, regions]);
      setRegions(prev => [...prev, finalRegion]);
    }
    
    setIsDrawing(false);
    setCurrentRegion(null);
  }, [isDrawing, currentRegion, regions]);

  const removeRegion = (id: string) => {
    setHistory(prev => [...prev, regions]);
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRegions(lastState);
  };

  const clearAll = () => {
    if (regions.length === 0) return;
    setHistory(prev => [...prev, regions]);
    setRegions([]);
  };

  const handleDeleteRegions = async () => {
    if (regions.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Create a prompt describing what to remove
      const removalPrompt = `Remove/erase the highlighted regions from this image. Fill in those areas naturally to match the surrounding content, making it look like those elements were never there. Keep the rest of the image exactly as it is.`;
      
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          action: 'enhance',
          imageUrl: imageUrl,
          enhancement: removalPrompt,
          maskRegions: regions.map(r => ({
            x: r.x / 100,
            y: r.y / 100,
            width: r.width / 100,
            height: r.height / 100,
          })),
        },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        onImageUpdated(data.imageUrl);
        toast.success('Elements removed successfully!');
        onClose();
      } else {
        throw new Error('No updated image returned');
      }
    } catch (error) {
      console.error('Error removing elements:', error);
      toast.error('Failed to remove elements. Try smaller regions.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 z-50">
        <Eraser className="h-4 w-4 text-white" />
        <span className="text-sm text-white font-medium">
          {regions.length === 0 ? 'Draw to highlight elements to remove' : `${regions.length} region${regions.length !== 1 ? 's' : ''} selected`}
        </span>
        
        <div className="w-px h-5 bg-white/30 mx-1" />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
          onClick={undo}
          disabled={history.length === 0 || isProcessing}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          onClick={clearAll}
          disabled={regions.length === 0 || isProcessing}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-white/30 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-white hover:text-white hover:bg-white/20"
          onClick={onClose}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        
        <Button
          variant="default"
          size="sm"
          className="h-7 bg-red-500 hover:bg-red-600 text-white"
          onClick={handleDeleteRegions}
          disabled={regions.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-1" />
          )}
          {isProcessing ? 'Removing...' : 'Delete Selected'}
        </Button>
      </div>
      
      {/* Drawing area */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        
        {/* Rendered regions */}
        {regions.map((region) => (
          <div
            key={region.id}
            className="absolute border-2 border-red-500 bg-red-500/30 cursor-pointer group"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isProcessing) removeRegion(region.id);
            }}
          >
            <button
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) removeRegion(region.id);
              }}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        
        {/* Current drawing region */}
        {currentRegion && (
          <div
            className="absolute border-2 border-dashed border-red-400 bg-red-400/20 pointer-events-none"
            style={{
              left: `${currentRegion.width >= 0 ? currentRegion.x : currentRegion.x + currentRegion.width}%`,
              top: `${currentRegion.height >= 0 ? currentRegion.y : currentRegion.y + currentRegion.height}%`,
              width: `${Math.abs(currentRegion.width)}%`,
              height: `${Math.abs(currentRegion.height)}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
