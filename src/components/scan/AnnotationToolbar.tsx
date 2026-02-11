import { useState } from 'react';
import { 
  Pencil, 
  Circle, 
  Square, 
  Type, 
  X as XIcon, 
  Check, 
  Trash2,
  Undo2,
  MousePointer,
  Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type AnnotationTool = 'select' | 'circle' | 'box' | 'arrow' | 'freehand' | 'text' | 'highlight' | 'x-mark';

export type AnnotationColor = 'red' | 'orange' | 'green' | 'blue';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  activeColor: AnnotationColor;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: AnnotationColor) => void;
  onUndo: () => void;
  onClearAll: () => void;
  canUndo: boolean;
  annotationCount: number;
}

const colorClasses: Record<AnnotationColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
};

export function AnnotationToolbar({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
  onUndo,
  onClearAll,
  canUndo,
  annotationCount,
}: AnnotationToolbarProps) {
  const tools: { id: AnnotationTool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { id: 'select', icon: MousePointer, label: 'Select & Move' },
    { id: 'circle', icon: Circle, label: 'Circle an error' },
    { id: 'box', icon: Square, label: 'Box an error' },
    { id: 'x-mark', icon: XIcon, label: 'X mark (wrong)' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight area' },
    { id: 'freehand', icon: Pencil, label: 'Freehand draw' },
    { id: 'text', icon: Type, label: 'Add text note' },
  ];

  const colors: AnnotationColor[] = ['red', 'orange', 'green', 'blue'];

  return (
    <div className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
      {/* Drawing tools */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-0.5 border-r pr-2 mr-1">
          {tools.map(({ id, icon: Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === id ? 'default' : 'ghost'}
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    activeTool === id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => onToolChange(id)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1 border-r pr-2 mr-1">
          {colors.map((color) => (
            <Tooltip key={color}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "h-6 w-6 rounded-full transition-all",
                    colorClasses[color],
                    activeColor === color 
                      ? "ring-2 ring-offset-2 ring-primary scale-110" 
                      : "opacity-70 hover:opacity-100"
                  )}
                  onClick={() => onColorChange(color)}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="capitalize">{color}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onClearAll}
                disabled={annotationCount === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear all annotations</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Annotation count */}
      {annotationCount > 0 && (
        <div className="ml-2 px-2 py-0.5 bg-muted rounded text-xs font-medium">
          {annotationCount} mark{annotationCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default AnnotationToolbar;
