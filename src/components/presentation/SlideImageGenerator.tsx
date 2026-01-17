import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Image, Wand2, Loader2, X, Move, ZoomIn, ZoomOut, 
  RotateCcw, Check, Trash2, GripVertical, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SlideImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageData: GeneratedImageData) => void;
  currentImage?: GeneratedImageData | null;
  slideTitle: string;
  topic: string;
}

export interface GeneratedImageData {
  url: string;
  prompt: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

export function SlideImageGenerator({
  open,
  onOpenChange,
  onImageGenerated,
  currentImage,
  slideTitle,
  topic,
}: SlideImageGeneratorProps) {
  const [prompt, setPrompt] = useState(
    currentImage?.prompt || 
    `Educational illustration for "${slideTitle}" about ${topic}. Clean, modern, professional style.`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(currentImage?.url || null);
  const [position, setPosition] = useState(currentImage?.position || { x: 50, y: 50 });
  const [size, setSize] = useState(currentImage?.size || { width: 400, height: 300 });
  const [rotation, setRotation] = useState(currentImage?.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialSize, setInitialSize] = useState({ width: 400, height: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentImage) {
      setPrompt(currentImage.prompt);
      setGeneratedUrl(currentImage.url);
      setPosition(currentImage.position);
      setSize(currentImage.size);
      setRotation(currentImage.rotation);
    }
  }, [currentImage]);

  // Reset prompt when slide changes
  useEffect(() => {
    if (!currentImage) {
      setPrompt(`Educational illustration for "${slideTitle}" about ${topic}. Clean, modern, professional style.`);
    }
  }, [slideTitle, topic, currentImage]);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the image you want to generate');
      return;
    }
    
    setIsGenerating(true);
    try {
      // Use Nano Banana (Gemini image model) via edge function
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          prompt: `${prompt}. Style: professional, educational, clean design, suitable for classroom presentation. No text in image.`,
          style: 'presentation',
          useNanoBanana: true,
        },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        setGeneratedUrl(data.imageUrl);
        toast.success('Image generated!');
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPosition({
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch/pinch handling for resize
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      setInitialPinchDistance(getTouchDistance(e.touches));
      setInitialSize({ ...size });
    } else if (e.touches.length === 1) {
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      
      setSize({
        width: Math.max(150, Math.min(800, initialSize.width * scale)),
        height: Math.max(100, Math.min(600, initialSize.height * scale)),
      });
    } else if (isDragging && e.touches.length === 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      const y = ((touch.clientY - rect.top) / rect.height) * 100;
      
      setPosition({
        x: Math.max(10, Math.min(90, x)),
        y: Math.max(10, Math.min(90, y)),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsPinching(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!generatedUrl) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setSize(s => ({
      width: Math.max(150, Math.min(800, s.width * delta)),
      height: Math.max(100, Math.min(600, s.height * delta)),
    }));
  };

  const handleSave = () => {
    if (!generatedUrl) return;
    
    onImageGenerated({
      url: generatedUrl,
      prompt,
      position,
      size,
      rotation,
    });
    onOpenChange(false);
  };

  const handleRemove = () => {
    onImageGenerated({
      url: '',
      prompt: '',
      position: { x: 50, y: 50 },
      size: { width: 400, height: 300 },
      rotation: 0,
    });
    onOpenChange(false);
  };

  const resetPosition = () => {
    setPosition({ x: 50, y: 50 });
    setSize({ width: 400, height: 300 });
    setRotation(0);
  };

  const zoomIn = () => {
    setSize(s => ({
      width: Math.min(800, s.width * 1.2),
      height: Math.min(600, s.height * 1.2),
    }));
  };

  const zoomOut = () => {
    setSize(s => ({
      width: Math.max(150, s.width * 0.8),
      height: Math.max(100, s.height * 0.8),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="h-6 w-6 text-primary" />
            Generate Slide Image
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Prompt and Generation */}
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Describe Your Image</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  // Allow all keys including spacebar - stop propagation to prevent parent handlers
                  e.stopPropagation();
                }}
                placeholder="Describe the image you want to generate in detail...

Example: A colorful diagram showing the water cycle with clouds, rain, rivers, and the ocean. Arrows showing evaporation and condensation. Bright, engaging colors suitable for students."
                className="min-h-[180px] text-base leading-relaxed resize-none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="true"
              />
              <p className="text-sm text-muted-foreground">
                💡 Tip: Be specific about style, colors, objects, and composition. The AI creates educational illustrations.
              </p>
            </div>

            <Button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Image...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  Generate Image
                </>
              )}
            </Button>

            {generatedUrl && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2">
                  <Move className="h-4 w-4" />
                  Position & Size
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Width: {size.width}px</Label>
                    <Slider
                      value={[size.width]}
                      onValueChange={([v]) => setSize(s => ({ ...s, width: v }))}
                      min={150}
                      max={800}
                      step={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Height: {size.height}px</Label>
                    <Slider
                      value={[size.height]}
                      onValueChange={([v]) => setSize(s => ({ ...s, height: v }))}
                      min={100}
                      max={600}
                      step={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Rotation: {rotation}°</Label>
                  <Slider
                    value={[rotation]}
                    onValueChange={([v]) => setRotation(v)}
                    min={-45}
                    max={45}
                    step={1}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={zoomIn} className="gap-1">
                    <ZoomIn className="h-4 w-4" />
                    Zoom In
                  </Button>
                  <Button variant="outline" size="sm" onClick={zoomOut} className="gap-1">
                    <ZoomOut className="h-4 w-4" />
                    Zoom Out
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetPosition} className="gap-1">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemove}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Large Preview */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Preview
              {generatedUrl && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Drag to move • Scroll to zoom • Pinch on touch devices)
                </span>
              )}
            </Label>
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl overflow-hidden border-2 touch-none",
                "min-h-[400px] lg:min-h-[500px]",
                isDragging ? "border-primary cursor-grabbing" : "border-muted-foreground/30 cursor-default"
              )}
              style={{ aspectRatio: '16/10' }}
            >
              {/* Slide content preview */}
              <div className="absolute inset-0 p-8 flex flex-col items-center justify-start pointer-events-none">
                <h3 className="text-white/20 text-2xl font-bold text-center mt-4">
                  {slideTitle}
                </h3>
              </div>

              {/* Generated image */}
              {generatedUrl && (
                <motion.div
                  ref={imageRef}
                  style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    width: `${Math.min(size.width * 0.6, 480)}px`,
                    height: `${Math.min(size.height * 0.6, 360)}px`,
                  }}
                  className={cn(
                    "cursor-grab active:cursor-grabbing transition-shadow",
                    isDragging ? "ring-4 ring-primary shadow-2xl" : "hover:ring-2 hover:ring-primary/50"
                  )}
                  onMouseDown={handleMouseDown}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <img
                    src={generatedUrl}
                    alt="Generated"
                    className="w-full h-full object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                    draggable={false}
                  />
                  <div className="absolute -top-3 -left-3 bg-primary rounded-full p-1.5 shadow-lg">
                    <Move className="h-4 w-4 text-primary-foreground" />
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!generatedUrl && !isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/40 p-8">
                    <Image className="h-20 w-20 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No image generated yet</p>
                    <p className="text-sm">Describe your image and click "Generate Image"</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <p className="text-white text-lg mt-4">Creating your image...</p>
                    <p className="text-white/60 text-sm mt-1">This may take a few seconds</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="lg">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!generatedUrl} className="gap-2" size="lg">
            <Check className="h-5 w-5" />
            Apply to Slide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
