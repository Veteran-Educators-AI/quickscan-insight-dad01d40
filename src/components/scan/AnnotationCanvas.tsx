import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AnnotationTool, AnnotationColor } from './AnnotationToolbar';

export interface Annotation {
  id: string;
  type: AnnotationTool;
  color: AnnotationColor;
  // Position as percentages of container
  x: number;
  y: number;
  // Size as percentages (for box, circle, highlight)
  width?: number;
  height?: number;
  // For freehand drawing
  points?: { x: number; y: number }[];
  // For text annotations
  text?: string;
  // Rotation for X marks
  rotation?: number;
}

interface AnnotationCanvasProps {
  annotations: Annotation[];
  activeTool: AnnotationTool;
  activeColor: AnnotationColor;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

const colorValues: Record<AnnotationColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  green: '#22c55e',
  blue: '#3b82f6',
};

export function AnnotationCanvas({
  annotations,
  activeTool,
  activeColor,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedId,
  onSelect,
  disabled = false,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState('');

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const generateId = () => `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || activeTool === 'select') return;
    
    e.preventDefault();
    const pos = getRelativePosition(e.clientX, e.clientY);
    setStartPos(pos);
    setCurrentPos(pos);
    setIsDrawing(true);

    if (activeTool === 'freehand') {
      setCurrentPoints([pos]);
    }
  }, [disabled, activeTool, getRelativePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    
    const pos = getRelativePosition(e.clientX, e.clientY);
    setCurrentPos(pos);

    if (activeTool === 'freehand') {
      setCurrentPoints(prev => [...prev, pos]);
    }
  }, [isDrawing, disabled, activeTool, getRelativePosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !currentPos || disabled) {
      setIsDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
      setCurrentPoints([]);
      return;
    }

    const id = generateId();

    if (activeTool === 'text') {
      // Create text annotation - will need input
      const newAnnotation: Annotation = {
        id,
        type: 'text',
        color: activeColor,
        x: startPos.x,
        y: startPos.y,
        text: '',
      };
      onAnnotationAdd(newAnnotation);
      setEditingTextId(id);
      setPendingText('');
    } else if (activeTool === 'x-mark') {
      // Create X mark at click position
      const newAnnotation: Annotation = {
        id,
        type: 'x-mark',
        color: activeColor,
        x: startPos.x,
        y: startPos.y,
        width: 4,
        height: 4,
      };
      onAnnotationAdd(newAnnotation);
    } else if (activeTool === 'freehand') {
      if (currentPoints.length > 2) {
        const newAnnotation: Annotation = {
          id,
          type: 'freehand',
          color: activeColor,
          x: 0,
          y: 0,
          points: currentPoints,
        };
        onAnnotationAdd(newAnnotation);
      }
    } else if (activeTool === 'circle' || activeTool === 'box' || activeTool === 'highlight') {
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);
      
      if (width > 1 && height > 1) {
        const newAnnotation: Annotation = {
          id,
          type: activeTool,
          color: activeColor,
          x: Math.min(startPos.x, currentPos.x),
          y: Math.min(startPos.y, currentPos.y),
          width,
          height,
        };
        onAnnotationAdd(newAnnotation);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
    setCurrentPoints([]);
  }, [isDrawing, startPos, currentPos, disabled, activeTool, activeColor, currentPoints, onAnnotationAdd]);

  const handleTextSubmit = useCallback((id: string, text: string) => {
    if (text.trim()) {
      onAnnotationUpdate(id, { text: text.trim() });
    } else {
      onAnnotationDelete(id);
    }
    setEditingTextId(null);
    setPendingText('');
  }, [onAnnotationUpdate, onAnnotationDelete]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && !editingTextId) {
        onAnnotationDelete(selectedId);
        onSelect(null);
      }
    }
    if (e.key === 'Escape') {
      onSelect(null);
      setEditingTextId(null);
    }
  }, [selectedId, editingTextId, onAnnotationDelete, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render preview shape while drawing
  const renderPreview = () => {
    if (!isDrawing || !startPos || !currentPos) return null;

    const color = colorValues[activeColor];
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (activeTool === 'freehand' && currentPoints.length > 1) {
      const pathD = currentPoints
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
      
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );
    }

    if (activeTool === 'circle') {
      return (
        <div
          className="absolute border-2 rounded-full pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            borderColor: color,
          }}
        />
      );
    }

    if (activeTool === 'box') {
      return (
        <div
          className="absolute border-2 pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            borderColor: color,
          }}
        />
      );
    }

    if (activeTool === 'highlight') {
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            height: `${height}%`,
            backgroundColor: color,
            opacity: 0.3,
          }}
        />
      );
    }

    return null;
  };

  // Render a single annotation
  const renderAnnotation = (annotation: Annotation) => {
    const color = colorValues[annotation.color];
    const isSelected = selectedId === annotation.id;
    const isEditing = editingTextId === annotation.id;

    const baseStyle = {
      left: `${annotation.x}%`,
      top: `${annotation.y}%`,
    };

    if (annotation.type === 'circle') {
      return (
        <div
          key={annotation.id}
          className={cn(
            "absolute border-2 rounded-full cursor-pointer transition-shadow",
            isSelected && "ring-2 ring-primary ring-offset-1"
          )}
          style={{
            ...baseStyle,
            width: `${annotation.width}%`,
            height: `${annotation.height}%`,
            borderColor: color,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(annotation.id);
          }}
        />
      );
    }

    if (annotation.type === 'box') {
      return (
        <div
          key={annotation.id}
          className={cn(
            "absolute border-2 cursor-pointer transition-shadow",
            isSelected && "ring-2 ring-primary ring-offset-1"
          )}
          style={{
            ...baseStyle,
            width: `${annotation.width}%`,
            height: `${annotation.height}%`,
            borderColor: color,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(annotation.id);
          }}
        />
      );
    }

    if (annotation.type === 'highlight') {
      return (
        <div
          key={annotation.id}
          className={cn(
            "absolute cursor-pointer transition-shadow",
            isSelected && "ring-2 ring-primary ring-offset-1"
          )}
          style={{
            ...baseStyle,
            width: `${annotation.width}%`,
            height: `${annotation.height}%`,
            backgroundColor: color,
            opacity: 0.35,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(annotation.id);
          }}
        />
      );
    }

    if (annotation.type === 'x-mark') {
      return (
        <div
          key={annotation.id}
          className={cn(
            "absolute cursor-pointer flex items-center justify-center",
            isSelected && "ring-2 ring-primary ring-offset-1 rounded"
          )}
          style={{
            ...baseStyle,
            transform: 'translate(-50%, -50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(annotation.id);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4L20 20M20 4L4 20"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    }

    if (annotation.type === 'freehand' && annotation.points) {
      const pathD = annotation.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');

      return (
        <svg
          key={annotation.id}
          className={cn(
            "absolute inset-0 w-full h-full pointer-events-none overflow-visible",
            isSelected && "[&>path]:drop-shadow-[0_0_2px_theme(colors.primary.DEFAULT)]"
          )}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(annotation.id);
            }}
          />
        </svg>
      );
    }

    if (annotation.type === 'text') {
      return (
        <div
          key={annotation.id}
          className={cn(
            "absolute cursor-pointer",
            isSelected && "ring-2 ring-primary ring-offset-1 rounded"
          )}
          style={{
            ...baseStyle,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditing) {
              onSelect(annotation.id);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingTextId(annotation.id);
            setPendingText(annotation.text || '');
          }}
        >
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={pendingText}
              onChange={(e) => setPendingText(e.target.value)}
              onBlur={() => handleTextSubmit(annotation.id, pendingText)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit(annotation.id, pendingText);
                }
                if (e.key === 'Escape') {
                  setEditingTextId(null);
                }
              }}
              className="min-w-[100px] px-1 py-0.5 text-sm font-medium bg-white border-2 rounded outline-none"
              style={{ borderColor: color, color }}
            />
          ) : (
            <span
              className="px-1.5 py-0.5 text-sm font-semibold rounded whitespace-nowrap"
              style={{
                backgroundColor: `${color}20`,
                color,
                border: `1px solid ${color}`,
              }}
            >
              {annotation.text || 'Click to edit'}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0",
        !disabled && activeTool !== 'select' && "cursor-crosshair"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) {
          handleMouseUp({} as React.MouseEvent);
        }
      }}
      onClick={() => {
        if (activeTool === 'select') {
          onSelect(null);
        }
      }}
    >
      {/* Render all annotations */}
      {annotations.map(renderAnnotation)}
      
      {/* Render preview while drawing */}
      {renderPreview()}
    </div>
  );
}

export default AnnotationCanvas;
