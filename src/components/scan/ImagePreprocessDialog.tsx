import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Wand2, Eye, EyeOff, Check, SunMedium, Contrast, Focus, Sparkles } from 'lucide-react';
import { 
  PreprocessingSettings, 
  defaultSettings, 
  createPreview, 
  preprocessImage 
} from '@/lib/imagePreprocessing';

interface ImagePreprocessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageBlob: Blob | null;
  imageName: string;
  onProcessed: (blob: Blob) => void;
}

export function ImagePreprocessDialog({
  open,
  onOpenChange,
  imageBlob,
  imageName,
  onProcessed,
}: ImagePreprocessDialogProps) {
  const [settings, setSettings] = useState<PreprocessingSettings>(defaultSettings);
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [processedPreview, setProcessedPreview] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [comparisonPosition, setComparisonPosition] = useState(50);

  // Generate original preview when image changes
  useEffect(() => {
    if (!imageBlob || !open) return;
    
    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    img.onload = () => {
      // Scale down for preview
      const maxSize = 600;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        setOriginalPreview(canvas.toDataURL('image/jpeg', 0.9));
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [imageBlob, open]);

  // Generate processed preview when settings change
  const updatePreview = useCallback(async () => {
    if (!imageBlob) return;
    
    setIsGeneratingPreview(true);
    try {
      const preview = await createPreview(imageBlob, settings, 600);
      setProcessedPreview(preview);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [imageBlob, settings]);

  useEffect(() => {
    if (open && imageBlob) {
      const timeout = setTimeout(updatePreview, 150); // Debounce
      return () => clearTimeout(timeout);
    }
  }, [open, settings, updatePreview, imageBlob]);

  const handleApply = async () => {
    if (!imageBlob) return;
    
    setIsProcessing(true);
    try {
      const processed = await preprocessImage(imageBlob, settings);
      onProcessed(processed);
      onOpenChange(false);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  const handleAutoEnhance = async () => {
    if (!imageBlob) return;
    
    setSettings(prev => ({ ...prev, autoEnhance: true }));
    // The preview will auto-update due to settings change
  };

  const updateSetting = (key: keyof PreprocessingSettings, value: number | boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      [key]: value,
      autoEnhance: false // Disable auto when manually adjusting
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Enhance Image Quality
            <Badge variant="secondary" className="ml-2">{imageName}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComparison(!showComparison)}
                >
                  {showComparison ? (
                    <><Eye className="h-4 w-4 mr-1" /> Split View</>
                  ) : (
                    <><EyeOff className="h-4 w-4 mr-1" /> Enhanced Only</>
                  )}
                </Button>
              </div>
            </div>

            <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
              {isGeneratingPreview && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {showComparison && originalPreview && processedPreview ? (
                <div className="relative w-full h-full">
                  {/* Original (left side) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` }}
                  >
                    <img 
                      src={originalPreview} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                    />
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 bg-background/80"
                    >
                      Original
                    </Badge>
                  </div>

                  {/* Enhanced (right side) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 0 0 ${comparisonPosition}%)` }}
                  >
                    <img 
                      src={processedPreview} 
                      alt="Enhanced" 
                      className="w-full h-full object-contain"
                    />
                    <Badge 
                      className="absolute top-2 right-2 bg-primary/80"
                    >
                      Enhanced
                    </Badge>
                  </div>

                  {/* Slider handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-20"
                    style={{ left: `${comparisonPosition}%` }}
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (!rect) return;
                      
                      const handleMove = (moveEvent: MouseEvent) => {
                        const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                        setComparisonPosition(Math.max(10, Math.min(90, x)));
                      };
                      
                      const handleUp = () => {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleUp);
                      };
                      
                      document.addEventListener('mousemove', handleMove);
                      document.addEventListener('mouseup', handleUp);
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-primary-foreground rounded" />
                        <div className="w-0.5 h-3 bg-primary-foreground rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <img 
                  src={processedPreview || originalPreview} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Drag the slider to compare original vs enhanced
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Auto Enhance Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label htmlFor="auto-enhance">Auto-Enhance</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-enhance"
                  checked={settings.autoEnhance}
                  onCheckedChange={(checked) => updateSetting('autoEnhance', checked)}
                />
                <Button variant="outline" size="sm" onClick={handleAutoEnhance}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Analyze
                </Button>
              </div>
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  Contrast
                </Label>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {settings.contrast > 0 ? '+' : ''}{settings.contrast}
                </span>
              </div>
              <Slider
                value={[settings.contrast]}
                onValueChange={([value]) => updateSetting('contrast', value)}
                min={-50}
                max={100}
                step={5}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <SunMedium className="h-4 w-4" />
                  Brightness
                </Label>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {settings.brightness > 0 ? '+' : ''}{settings.brightness}
                </span>
              </div>
              <Slider
                value={[settings.brightness]}
                onValueChange={([value]) => updateSetting('brightness', value)}
                min={-50}
                max={50}
                step={5}
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Focus className="h-4 w-4" />
                  Sharpness
                </Label>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {settings.sharpness}%
                </span>
              </div>
              <Slider
                value={[settings.sharpness]}
                onValueChange={([value]) => updateSetting('sharpness', value)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Noise Reduction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Noise Reduction
                </Label>
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {settings.noiseReduction}%
                </span>
              </div>
              <Slider
                value={[settings.noiseReduction]}
                onValueChange={([value]) => updateSetting('noiseReduction', value)}
                min={0}
                max={60}
                step={5}
              />
            </div>

            {/* Tips */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm space-y-1">
              <p className="font-medium text-blue-700 dark:text-blue-300">💡 Tips for best results:</p>
              <ul className="text-blue-600 dark:text-blue-400 text-xs space-y-1 ml-4 list-disc">
                <li>Increase contrast for faded pencil work</li>
                <li>Add sharpness for blurry phone photos</li>
                <li>Use noise reduction for grainy scans</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isProcessing}>
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Apply Enhancement</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
