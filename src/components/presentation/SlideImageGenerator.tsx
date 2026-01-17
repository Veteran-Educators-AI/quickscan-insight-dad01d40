import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Image, Wand2, Loader2, X, Move, ZoomIn, ZoomOut, 
  RotateCcw, Check, Trash2, GripVertical 
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
  const [position, setPosition] = useState(currentImage?.position || { x: 50, y: 30 });
  const [size, setSize] = useState(currentImage?.size || { width: 300, height: 200 });
  const [rotation, setRotation] = useState(currentImage?.rotation || 0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentImage) {
      setPrompt(currentImage.prompt);
      setGeneratedUrl(currentImage.url);
      setPosition(currentImage.position);
      setSize(currentImage.size);
      setRotation(currentImage.rotation);
    }
  }, [currentImage]);

  const generateImage = async () => {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      position: { x: 50, y: 30 },
      size: { width: 300, height: 200 },
      rotation: 0,
    });
    onOpenChange(false);
  };

  const resetPosition = () => {
    setPosition({ x: 50, y: 30 });
    setSize({ width: 300, height: 200 });
    setRotation(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generate Slide Image
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Prompt and Generation */}
          <div className="space-y-4">
            <div>
              <Label>Image Description</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="mt-1.5 min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific about style, colors, and content. The AI will create an educational illustration.
              </p>
            </div>

            <Button 
              onClick={generateImage} 
              disabled={isGenerating || !prompt.trim()}
              className="w-full gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Image
                </>
              )}
            </Button>

            {generatedUrl && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Position & Size</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Slider
                      value={[size.width]}
                      onValueChange={([v]) => setSize(s => ({ ...s, width: v }))}
                      min={100}
                      max={600}
                      step={10}
                      className="mt-2"
                    />
                    <span className="text-xs text-muted-foreground">{size.width}px</span>
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Slider
                      value={[size.height]}
                      onValueChange={([v]) => setSize(s => ({ ...s, height: v }))}
                      min={80}
                      max={400}
                      step={10}
                      className="mt-2"
                    />
                    <span className="text-xs text-muted-foreground">{size.height}px</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Rotation</Label>
                  <Slider
                    value={[rotation]}
                    onValueChange={([v]) => setRotation(v)}
                    min={-45}
                    max={45}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-muted-foreground">{rotation}°</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetPosition} className="gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemove}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-2">
            <Label>Preview (drag to position)</Label>
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "relative aspect-video bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-lg overflow-hidden border-2 border-dashed",
                isDragging ? "border-primary cursor-grabbing" : "border-muted cursor-default"
              )}
            >
              {/* Slide content preview */}
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center pointer-events-none">
                <h3 className="text-white text-xl font-bold text-center opacity-30">
                  {slideTitle}
                </h3>
              </div>

              {/* Generated image */}
              {generatedUrl && (
                <motion.div
                  style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    width: `${size.width * 0.5}px`,
                    height: `${size.height * 0.5}px`,
                  }}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    isDragging && "ring-2 ring-primary"
                  )}
                  onMouseDown={handleMouseDown}
                  whileHover={{ scale: 1.02 }}
                >
                  <img
                    src={generatedUrl}
                    alt="Generated"
                    className="w-full h-full object-contain rounded-lg shadow-2xl pointer-events-none"
                    draggable={false}
                  />
                  <div className="absolute -top-2 -left-2 bg-primary rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity">
                    <Move className="h-3 w-3 text-primary-foreground" />
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!generatedUrl && !isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/40">
                    <Image className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Generate an image to preview</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-white/60 text-sm mt-2">Generating...</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Click and drag the image to reposition it on the slide
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!generatedUrl} className="gap-2">
            <Check className="h-4 w-4" />
            Apply to Slide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
