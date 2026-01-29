import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Trash2, X, Undo2, Check, Loader2, Eraser, Type, Move, 
  Minus, Plus, RotateCcw, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TextAnnotation {
  id: string;
  text: string;
  x: number; // percentage
  y: number; // percentage
  fontSize: number; // px
  color: string;
  rotation: number;
}

interface Region {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type Tool = 'select' | 'text' | 'erase';

interface ImageAnnotationEditorProps {
  imageUrl: string;
  onImageUpdated: (newUrl: string) => void;
  onClose: () => void;
}

const COLORS = [
  '#ffffff', // white
  '#fbbf24', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#000000', // black
];

export function ImageAnnotationEditor({ imageUrl, onImageUpdated, onClose }: ImageAnnotationEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('text');
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<{ annotations: TextAnnotation[]; regions: Region[] }[]>([]);
  
  // Drawing state for erase mode
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  
  // Text creation state
  const [newTextPosition, setNewTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [newTextValue, setNewTextValue] = useState('');
  
  // Annotation styling defaults
  const [currentFontSize, setCurrentFontSize] = useState(32);
  const [currentColor, setCurrentColor] = useState('#ffffff');
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev, { annotations: [...annotations], regions: [...regions] }]);
  }, [annotations, regions]);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  // Handle click to add text
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (tool !== 'text' || isDrawing || isDragging) return;
    
    // Don't add text if clicking on existing annotation
    const target = e.target as HTMLElement;
    if (target.closest('[data-annotation]')) return;
    
    const pos = getRelativePosition(e.clientX, e.clientY);
    setNewTextPosition(pos);
    setNewTextValue('');
  }, [tool, isDrawing, isDragging, getRelativePosition]);

  // Confirm new text
  const confirmNewText = useCallback(() => {
    if (!newTextPosition || !newTextValue.trim()) {
      setNewTextPosition(null);
      return;
    }
    
    saveHistory();
    const newAnnotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      text: newTextValue.trim(),
      x: newTextPosition.x,
      y: newTextPosition.y,
      fontSize: currentFontSize,
      color: currentColor,
      rotation: 0,
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setNewTextPosition(null);
    setNewTextValue('');
    setSelectedId(newAnnotation.id);
  }, [newTextPosition, newTextValue, currentFontSize, currentColor, saveHistory]);

  // Handle keyboard for text input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && newTextPosition) {
        e.preventDefault();
        confirmNewText();
      } else if (e.key === 'Escape') {
        if (newTextPosition) {
          setNewTextPosition(null);
        } else if (selectedId) {
          setSelectedId(null);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !newTextPosition) {
          saveHistory();
          setAnnotations(prev => prev.filter(a => a.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newTextPosition, selectedId, confirmNewText, saveHistory]);

  // Erase tool handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool !== 'erase') return;
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
  }, [tool, getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tool === 'erase' && isDrawing && currentRegion) {
      const pos = getRelativePosition(e.clientX, e.clientY);
      setCurrentRegion(prev => prev ? {
        ...prev,
        width: pos.x - prev.x,
        height: pos.y - prev.y,
      } : null);
    }
    
    // Handle dragging annotations
    if (isDragging && selectedId) {
      const pos = getRelativePosition(e.clientX, e.clientY);
      setAnnotations(prev => prev.map(a => 
        a.id === selectedId 
          ? { ...a, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : a
      ));
    }
  }, [tool, isDrawing, currentRegion, isDragging, selectedId, dragOffset, getRelativePosition]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'erase' && isDrawing && currentRegion) {
      let finalRegion = { ...currentRegion };
      if (finalRegion.width < 0) {
        finalRegion.x += finalRegion.width;
        finalRegion.width = Math.abs(finalRegion.width);
      }
      if (finalRegion.height < 0) {
        finalRegion.y += finalRegion.height;
        finalRegion.height = Math.abs(finalRegion.height);
      }
      
      if (finalRegion.width > 2 && finalRegion.height > 2) {
        saveHistory();
        setRegions(prev => [...prev, finalRegion]);
      }
    }
    
    setIsDrawing(false);
    setCurrentRegion(null);
    setIsDragging(false);
  }, [tool, isDrawing, currentRegion, saveHistory]);

  // Start dragging an annotation
  const handleAnnotationMouseDown = useCallback((e: React.MouseEvent, annotation: TextAnnotation) => {
    if (tool !== 'select' && tool !== 'text') return;
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getRelativePosition(e.clientX, e.clientY);
    setSelectedId(annotation.id);
    setIsDragging(true);
    setDragOffset({
      x: pos.x - annotation.x,
      y: pos.y - annotation.y,
    });
  }, [tool, getRelativePosition]);

  // Update selected annotation
  const updateSelectedAnnotation = useCallback((updates: Partial<TextAnnotation>) => {
    if (!selectedId) return;
    saveHistory();
    setAnnotations(prev => prev.map(a => 
      a.id === selectedId ? { ...a, ...updates } : a
    ));
  }, [selectedId, saveHistory]);

  const undo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setAnnotations(lastState.annotations);
    setRegions(lastState.regions);
  };

  const clearAll = () => {
    if (annotations.length === 0 && regions.length === 0) return;
    saveHistory();
    setAnnotations([]);
    setRegions([]);
    setSelectedId(null);
  };

  // Apply changes - render text on image and erase regions
  const handleApplyChanges = async () => {
    if (annotations.length === 0 && regions.length === 0) {
      onClose();
      return;
    }
    
    setIsProcessing(true);
    try {
      let prompt = '';
      
      if (annotations.length > 0) {
        const textDescriptions = annotations.map((a, i) => 
          `Text "${a.text}" at position ${Math.round(a.x)}% from left, ${Math.round(a.y)}% from top, in ${a.color} color, size approximately ${a.fontSize}px`
        ).join('. ');
        prompt += `Add the following text overlays to this image, exactly as specified: ${textDescriptions}. `;
      }
      
      if (regions.length > 0) {
        prompt += `Also remove/erase these highlighted regions and fill them naturally: `;
        prompt += regions.map((r, i) => 
          `Region ${i + 1}: starting at ${Math.round(r.x)}% from left, ${Math.round(r.y)}% from top, spanning ${Math.round(r.width)}% width and ${Math.round(r.height)}% height`
        ).join('; ');
      }
      
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          action: 'enhance',
          imageUrl: imageUrl,
          enhancement: prompt,
          textAnnotations: annotations,
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
        toast.success('Image updated successfully!');
        onClose();
      } else {
        throw new Error('No updated image returned');
      }
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Failed to update image. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  return (
    <div className="absolute inset-0 z-40 flex flex-col">
      {/* Top Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 z-50">
        {/* Tool Selection */}
        <div className="flex items-center gap-1 pr-2 border-r border-white/20">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg",
              tool === 'text' ? "bg-primary text-primary-foreground" : "text-white hover:text-white hover:bg-white/20"
            )}
            onClick={() => setTool('text')}
            title="Add text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg",
              tool === 'erase' ? "bg-red-500 text-white" : "text-white hover:text-white hover:bg-white/20"
            )}
            onClick={() => setTool('erase')}
            title="Erase regions"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg",
              tool === 'select' ? "bg-blue-500 text-white" : "text-white hover:text-white hover:bg-white/20"
            )}
            onClick={() => setTool('select')}
            title="Select & move"
          >
            <Move className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Text Size Control (when text tool or annotation selected) */}
        {(tool === 'text' || selectedAnnotation) && (
          <div className="flex items-center gap-2 px-2 border-r border-white/20">
            <span className="text-xs text-white/60">Size:</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => {
                const newSize = Math.max(12, (selectedAnnotation?.fontSize || currentFontSize) - 4);
                if (selectedAnnotation) {
                  updateSelectedAnnotation({ fontSize: newSize });
                } else {
                  setCurrentFontSize(newSize);
                }
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm text-white font-mono w-8 text-center">
              {selectedAnnotation?.fontSize || currentFontSize}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => {
                const newSize = Math.min(120, (selectedAnnotation?.fontSize || currentFontSize) + 4);
                if (selectedAnnotation) {
                  updateSelectedAnnotation({ fontSize: newSize });
                } else {
                  setCurrentFontSize(newSize);
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Color Selection */}
        {(tool === 'text' || selectedAnnotation) && (
          <div className="flex items-center gap-1 px-2 border-r border-white/20">
            {COLORS.map(color => (
              <button
                key={color}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                  (selectedAnnotation?.color || currentColor) === color 
                    ? "border-white scale-110" 
                    : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  if (selectedAnnotation) {
                    updateSelectedAnnotation({ color });
                  } else {
                    setCurrentColor(color);
                  }
                }}
              />
            ))}
          </div>
        )}
        
        {/* Status */}
        <span className="text-sm text-white/70 px-2">
          {tool === 'text' && 'Click to add text'}
          {tool === 'erase' && `${regions.length} region${regions.length !== 1 ? 's' : ''}`}
          {tool === 'select' && (selectedId ? 'Drag to move' : 'Click to select')}
        </span>
        
        {/* Actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/20">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
            onClick={undo}
            disabled={history.length === 0 || isProcessing}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
            onClick={clearAll}
            disabled={(annotations.length === 0 && regions.length === 0) || isProcessing}
            title="Clear all"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
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
            className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleApplyChanges}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            {isProcessing ? 'Applying...' : 'Apply'}
          </Button>
        </div>
      </div>
      
      {/* Canvas area */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0",
          tool === 'erase' && "cursor-crosshair",
          tool === 'text' && "cursor-text",
          tool === 'select' && "cursor-default"
        )}
        onClick={handleContainerClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        
        {/* Text Annotations */}
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            data-annotation
            className={cn(
              "absolute cursor-move select-none",
              selectedId === annotation.id && "ring-2 ring-primary ring-offset-2 ring-offset-transparent"
            )}
            style={{
              left: `${annotation.x}%`,
              top: `${annotation.y}%`,
              transform: `translate(-50%, -50%) rotate(${annotation.rotation}deg)`,
              fontSize: `${annotation.fontSize}px`,
              color: annotation.color,
              fontWeight: 'bold',
              textShadow: annotation.color === '#ffffff' || annotation.color === '#fbbf24'
                ? '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.5)'
                : '2px 2px 4px rgba(255,255,255,0.3)',
              WebkitTextStroke: annotation.color === '#000000' ? '1px rgba(255,255,255,0.3)' : undefined,
            }}
            onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(annotation.id);
            }}
          >
            {annotation.text}
            
            {/* Delete button on selected */}
            {selectedId === annotation.id && (
              <button
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  saveHistory();
                  setAnnotations(prev => prev.filter(a => a.id !== annotation.id));
                  setSelectedId(null);
                }}
              >
                <X className="h-3 w-3 text-white" />
              </button>
            )}
          </div>
        ))}
        
        {/* New text input */}
        {newTextPosition && (
          <div
            className="absolute z-50"
            style={{
              left: `${newTextPosition.x}%`,
              top: `${newTextPosition.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              autoFocus
              value={newTextValue}
              onChange={(e) => setNewTextValue(e.target.value)}
              onBlur={confirmNewText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmNewText();
                } else if (e.key === 'Escape') {
                  setNewTextPosition(null);
                }
                e.stopPropagation();
              }}
              placeholder="Type text..."
              className="min-w-[200px] bg-black/80 border-white/40 text-white text-lg font-bold"
              style={{
                fontSize: `${currentFontSize * 0.6}px`,
                color: currentColor,
              }}
            />
          </div>
        )}
        
        {/* Erase Regions */}
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
              if (!isProcessing) {
                saveHistory();
                setRegions(prev => prev.filter(r => r.id !== region.id));
              }
            }}
          >
            <button
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                if (!isProcessing) {
                  saveHistory();
                  setRegions(prev => prev.filter(r => r.id !== region.id));
                }
              }}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        
        {/* Current drawing region (erase mode) */}
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
      
      {/* Bottom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-white/70 text-sm">
        {tool === 'text' && 'Click anywhere to add text • Press Enter to confirm • Esc to cancel'}
        {tool === 'erase' && 'Draw rectangles over elements to remove them'}
        {tool === 'select' && 'Click text to select • Drag to move • Delete key to remove'}
      </div>
    </div>
  );
}
