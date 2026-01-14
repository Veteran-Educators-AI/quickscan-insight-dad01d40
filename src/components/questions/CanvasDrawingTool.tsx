import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Triangle, 
  Minus, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  Check, 
  X,
  Move,
  Type,
  Pentagon,
  Hexagon,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'text' | 'move';

interface CanvasDrawingToolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveDrawing: (dataUrl: string, questionNumber?: number) => void;
  questionNumber?: number;
  initialImage?: string;
}

interface Point {
  x: number;
  y: number;
}

interface DrawAction {
  type: 'path' | 'shape' | 'text' | 'clear';
  tool: Tool;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  color: string;
  lineWidth: number;
  text?: string;
}

const PRESET_COLORS = [
  '#1f2937', // Dark gray (default)
  '#000000', // Black
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const SHAPE_TEMPLATES = [
  { id: 'right-triangle', name: 'Right Triangle', icon: Triangle },
  { id: 'isosceles-triangle', name: 'Isosceles Triangle', icon: Triangle },
  { id: 'equilateral-triangle', name: 'Equilateral Triangle', icon: Triangle },
  { id: 'square', name: 'Square', icon: Square },
  { id: 'rectangle', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'pentagon', name: 'Pentagon', icon: Pentagon },
  { id: 'hexagon', name: 'Hexagon', icon: Hexagon },
];

export function CanvasDrawingTool({ 
  open, 
  onOpenChange, 
  onSaveDrawing, 
  questionNumber,
  initialImage 
}: CanvasDrawingToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1f2937');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);

  const canvasWidth = 500;
  const canvasHeight = 400;

  // Initialize canvas
  useEffect(() => {
    if (!open) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load initial image if provided
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        saveToHistory();
      };
      img.src = initialImage;
    } else {
      saveToHistory();
    }
  }, [open, initialImage]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    saveToHistory();
  }, [saveToHistory]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    
    if (tool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }
    
    setIsDrawing(true);
    setStartPoint(pos);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [tool, color, lineWidth, getMousePos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // For shapes, we need to redraw from history
      if (historyIndex >= 0 && history[historyIndex]) {
        ctx.putImageData(history[historyIndex], 0, 0);
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      switch (tool) {
        case 'line':
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(pos.x, pos.y);
          break;
        case 'arrow':
          // Draw line
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          // Draw arrowhead
          const angle = Math.atan2(pos.y - startPoint.y, pos.x - startPoint.x);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headLength * Math.cos(angle - Math.PI / 6), pos.y - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headLength * Math.cos(angle + Math.PI / 6), pos.y - headLength * Math.sin(angle + Math.PI / 6));
          break;
        case 'rectangle':
          ctx.rect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
          break;
        case 'circle':
          const radius = Math.sqrt(Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2));
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
          break;
        case 'triangle':
          const midX = (startPoint.x + pos.x) / 2;
          ctx.moveTo(midX, startPoint.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.lineTo(startPoint.x, pos.y);
          ctx.closePath();
          break;
      }
      
      ctx.stroke();
    }
  }, [isDrawing, startPoint, tool, color, lineWidth, getMousePos, history, historyIndex]);

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      saveToHistory();
    }
    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, saveToHistory]);

  const addText = useCallback(() => {
    if (!textPosition || !textInput) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = color;
    ctx.font = `${lineWidth * 6}px serif`;
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setShowTextInput(false);
    setTextInput('');
    setTextPosition(null);
    saveToHistory();
  }, [textPosition, textInput, color, lineWidth, saveToHistory]);

  const drawShapeTemplate = useCallback((shapeId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const size = 120;

    ctx.beginPath();

    switch (shapeId) {
      case 'right-triangle':
        ctx.moveTo(centerX - size/2, centerY + size/2);
        ctx.lineTo(centerX + size/2, centerY + size/2);
        ctx.lineTo(centerX - size/2, centerY - size/2);
        ctx.closePath();
        // Right angle marker
        ctx.stroke();
        ctx.beginPath();
        const markerSize = 15;
        ctx.moveTo(centerX - size/2 + markerSize, centerY + size/2);
        ctx.lineTo(centerX - size/2 + markerSize, centerY + size/2 - markerSize);
        ctx.lineTo(centerX - size/2, centerY + size/2 - markerSize);
        break;
      case 'isosceles-triangle':
        ctx.moveTo(centerX, centerY - size/2);
        ctx.lineTo(centerX + size/2, centerY + size/2);
        ctx.lineTo(centerX - size/2, centerY + size/2);
        ctx.closePath();
        break;
      case 'equilateral-triangle':
        const h = size * Math.sqrt(3) / 2;
        ctx.moveTo(centerX, centerY - h/2);
        ctx.lineTo(centerX + size/2, centerY + h/2);
        ctx.lineTo(centerX - size/2, centerY + h/2);
        ctx.closePath();
        break;
      case 'square':
        ctx.rect(centerX - size/2, centerY - size/2, size, size);
        break;
      case 'rectangle':
        ctx.rect(centerX - size*0.7, centerY - size/2, size*1.4, size);
        break;
      case 'circle':
        ctx.arc(centerX, centerY, size/2, 0, 2 * Math.PI);
        break;
      case 'pentagon':
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
          const x = centerX + size/2 * Math.cos(angle);
          const y = centerY + size/2 * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
          const x = centerX + size/2 * Math.cos(angle);
          const y = centerY + size/2 * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
    }
    
    ctx.stroke();
    saveToHistory();
  }, [color, lineWidth, saveToHistory]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    onSaveDrawing(dataUrl, questionNumber);
    onOpenChange(false);
  }, [onSaveDrawing, questionNumber, onOpenChange]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `drawing-${questionNumber || 'custom'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [questionNumber]);

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'text', icon: Type, label: 'Text' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Draw Custom Shape
            {questionNumber && (
              <Badge variant="secondary" className="ml-2">
                Question {questionNumber}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Use the drawing tools to create a custom diagram or shape for your worksheet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Tools Panel */}
          <div className="w-48 space-y-4">
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
                <TabsTrigger value="shapes" className="text-xs">Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tools" className="mt-3 space-y-4">
                {/* Tool Selection */}
                <div className="grid grid-cols-4 gap-1">
                  {tools.map((t) => (
                    <Button
                      key={t.id}
                      variant={tool === t.id ? 'default' : 'outline'}
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setTool(t.id)}
                      title={t.label}
                    >
                      <t.icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>

                <Separator />

                {/* Color Selection */}
                <div className="space-y-2">
                  <Label className="text-xs">Color</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "h-7 w-7 rounded-md border-2 transition-all",
                          color === c ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Line Width */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Line Width</Label>
                    <span className="text-xs text-muted-foreground">{lineWidth}px</span>
                  </div>
                  <Slider
                    value={[lineWidth]}
                    onValueChange={(v) => setLineWidth(v[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="shapes" className="mt-3">
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {SHAPE_TEMPLATES.map((shape) => (
                      <Button
                        key={shape.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 h-8"
                        onClick={() => drawShapeTemplate(shape.id)}
                      >
                        <shape.icon className="h-4 w-4" />
                        <span className="text-xs">{shape.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearCanvas}
                  title="Clear"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 border rounded-lg bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>

        {/* Text Input Dialog */}
        {showTextInput && textPosition && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg p-4 shadow-lg z-50">
            <div className="space-y-3">
              <Label>Enter text label:</Label>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., A, B, 90°, x"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addText();
                  if (e.key === 'Escape') {
                    setShowTextInput(false);
                    setTextInput('');
                    setTextPosition(null);
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInput('');
                    setTextPosition(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={addText}>
                  Add Text
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Add to Worksheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
