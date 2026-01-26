import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Image, Wand2, Loader2, X, Move, ZoomIn, ZoomOut, 
  RotateCcw, Check, Trash2, GripVertical, Maximize2, Minimize2,
  LayoutGrid, PieChart, BarChart3, GitBranch, Layers, Target,
  Lightbulb, Workflow, Users, BookOpen, Beaker, Globe, Calculator,
  Atom, Brain, Clock, Sparkles, Plus, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSubjectSuggestions, createTopicSpecificPrompt, type ImageSuggestion } from '@/data/presentationImageSuggestions';

// Generate a rich, topic-focused description instead of presentation meta-language
function generateDefaultTopicPrompt(slideTitle: string, topic: string): string {
  const cleanTitle = slideTitle.replace(/\*\*/g, '').replace(/["']/g, '');
  
  return `Create a detailed, educational illustration about ${cleanTitle} in the context of ${topic}. 

Focus on accurately depicting the actual subject matter - the processes, structures, concepts, or ideas that students need to understand. For scientific topics, show the real biological, chemical, or physical phenomena. For historical topics, depict the authentic setting, people, and events. For literary themes, visualize the metaphors, emotions, and symbolic content.

Use vibrant, engaging colors appropriate to the subject. The illustration should be scientifically, historically, or thematically accurate. Professional quality suitable for classroom use. Clean composition with a clear focal point. No text, labels, or words in the image.`;
}

// Template categories and items
const imageTemplates = {
  diagrams: [
    { id: 'flowchart', label: 'Flowchart', icon: Workflow, prompt: 'A clear flowchart diagram with connected boxes and arrows, showing a process flow. Clean lines, professional look, minimal colors.' },
    { id: 'venn', label: 'Venn Diagram', icon: Layers, prompt: 'A Venn diagram with 2-3 overlapping circles, showing relationships between concepts. Soft pastel colors, clear labels areas.' },
    { id: 'cycle', label: 'Cycle Diagram', icon: RotateCcw, prompt: 'A circular cycle diagram with 4-5 stages connected by curved arrows. Colorful, engaging, easy to follow.' },
    { id: 'hierarchy', label: 'Hierarchy Tree', icon: GitBranch, prompt: 'A hierarchical tree diagram showing parent-child relationships. Clean organizational structure, professional colors.' },
    { id: 'timeline', label: 'Timeline', icon: Clock, prompt: 'A horizontal timeline with key milestones and dates. Modern design, clear markers, professional styling.' },
    { id: 'mindmap', label: 'Mind Map', icon: Brain, prompt: 'A colorful mind map with a central topic and branching subtopics. Organic, creative layout, engaging colors.' },
  ],
  charts: [
    { id: 'bar', label: 'Bar Chart', icon: BarChart3, prompt: 'A clean bar chart with 5-6 bars showing comparison data. Professional colors, clear labels, modern design.' },
    { id: 'pie', label: 'Pie Chart', icon: PieChart, prompt: 'A pie chart with 4-5 colorful segments showing proportions. Clear percentage labels, professional look.' },
    { id: 'line', label: 'Line Graph', icon: LayoutGrid, prompt: 'A line graph showing trends over time with 2-3 lines. Grid background, clear axis labels, modern styling.' },
    { id: 'comparison', label: 'Comparison', icon: Layers, prompt: 'A side-by-side comparison infographic showing two options with pros and cons. Clean, balanced layout.' },
  ],
  concepts: [
    { id: 'lightbulb', label: 'Idea/Innovation', icon: Lightbulb, prompt: 'A glowing lightbulb representing ideas and innovation. Creative, inspiring, bright colors with sparkles.' },
    { id: 'target', label: 'Goals/Target', icon: Target, prompt: 'A target with an arrow hitting the bullseye, representing goals and achievement. Dynamic, motivating design.' },
    { id: 'teamwork', label: 'Teamwork', icon: Users, prompt: 'Diverse people working together as a team. Collaborative, inclusive, positive atmosphere.' },
    { id: 'growth', label: 'Growth', icon: BarChart3, prompt: 'A plant or arrow growing upward representing growth and progress. Green tones, optimistic, dynamic.' },
    { id: 'success', label: 'Success', icon: Check, prompt: 'A person reaching the top of a mountain or podium celebrating success. Inspirational, triumphant mood.' },
  ],
  subjects: [
    { id: 'science', label: 'Science', icon: Beaker, prompt: 'Scientific laboratory equipment like beakers, test tubes, and molecules. Clean, educational, colorful.' },
    { id: 'math', label: 'Mathematics', icon: Calculator, prompt: 'Mathematical symbols, equations, geometric shapes, and numbers. Educational, clean, organized layout.' },
    { id: 'geography', label: 'Geography', icon: Globe, prompt: 'A globe or world map with geographic features highlighted. Educational, colorful continents, clean design.' },
    { id: 'literature', label: 'Literature', icon: BookOpen, prompt: 'Open books with pages flying, quill pen, literary symbols. Warm, classic, inviting atmosphere.' },
    { id: 'physics', label: 'Physics', icon: Atom, prompt: 'Atoms, planetary orbits, physics equations, and energy symbols. Scientific, modern, dynamic design.' },
  ],
};

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
    generateDefaultTopicPrompt(slideTitle, topic)
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
  const [isDropping, setIsDropping] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<{ title: string; prompt: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get topic-specific image suggestions
  const topicSuggestions = useMemo(() => {
    // Extract subject from topic if possible
    const subject = topic.split(' - ')[0] || topic;
    return getSubjectSuggestions(subject, topic, slideTitle);
  }, [topic, slideTitle]);

  // Handle selecting a suggestion - show modification prompt first
  const handleSelectSuggestion = (title: string, suggestionPrompt: string) => {
    const fullPrompt = createTopicSpecificPrompt(suggestionPrompt, topic, slideTitle);
    setPendingSuggestion({ title, prompt: fullPrompt });
    setPrompt(fullPrompt);
  };

  // Confirm and generate from pending suggestion
  const confirmAndGenerate = () => {
    setPendingSuggestion(null);
    generateImage();
  };

  // Cancel pending suggestion
  const cancelPendingSuggestion = () => {
    setPendingSuggestion(null);
  };

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
      setPrompt(generateDefaultTopicPrompt(slideTitle, topic));
    }
  }, [slideTitle, topic, currentImage]);

  // Handle file upload (drag-drop or file picker)
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG or PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setGeneratedUrl(dataUrl);
      setPrompt(`Custom uploaded image: ${file.name}`);
      toast.success('Image uploaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropping(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropping(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropping(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFileUpload]);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the image you want to generate');
      return;
    }
    
    setIsGenerating(true);
    try {
      // Use the presentation-specific generation which properly handles non-math content
      // Pass the full prompt with topic/slide context for accurate image generation
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          prompt: prompt, // Use the user's exact prompt - the edge function will enhance it
          style: 'presentation', // This routes to the correct handler that respects the prompt
          topic: topic,
          slideTitle: slideTitle,
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
          {/* Left: Prompt, Templates, and Generation */}
          <div className="space-y-6">
            {/* Template Gallery */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Quick Templates
              </Label>
              <Tabs defaultValue="suggested" className="w-full">
                <TabsList className="w-full grid grid-cols-5 h-auto">
                  <TabsTrigger value="suggested" className="text-xs py-1.5 gap-1">
                    <Sparkles className="h-3 w-3" />
                    Topic
                  </TabsTrigger>
                  <TabsTrigger value="diagrams" className="text-xs py-1.5">Diagrams</TabsTrigger>
                  <TabsTrigger value="charts" className="text-xs py-1.5">Charts</TabsTrigger>
                  <TabsTrigger value="concepts" className="text-xs py-1.5">Concepts</TabsTrigger>
                  <TabsTrigger value="subjects" className="text-xs py-1.5">Subjects</TabsTrigger>
                </TabsList>

                {/* Topic-Specific Suggestions - Click to preview/modify before generating */}
                <TabsContent value="suggested" className="mt-3">
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-2 pr-4">
                      {topicSuggestions.length > 0 ? (
                        topicSuggestions.map((suggestion) => (
                          <Button
                            key={suggestion.id}
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full h-auto py-3 px-3 flex items-center justify-between text-left",
                              "hover:bg-primary/10 hover:border-primary transition-colors",
                              pendingSuggestion?.title === suggestion.title && "border-primary bg-primary/10"
                            )}
                            onClick={() => handleSelectSuggestion(suggestion.title, suggestion.prompt)}
                            disabled={isGenerating}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{suggestion.title}</div>
                              <div className="text-xs text-muted-foreground">{suggestion.category}</div>
                            </div>
                            <Sparkles className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                          </Button>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No specific suggestions for this topic. Try the other tabs or write a custom prompt.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    ✨ Click a suggestion to preview - you can modify before generating.
                  </p>
                </TabsContent>

                {Object.entries(imageTemplates).map(([category, templates]) => (
                  <TabsContent key={category} value={category} className="mt-3">
                    <ScrollArea className="h-[140px]">
                      <div className="grid grid-cols-3 gap-2 pr-4">
                        {templates.map((template) => {
                          const IconComponent = template.icon;
                          return (
                            <Button
                              key={template.id}
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-auto py-2 px-2 flex flex-col items-center gap-1 text-xs",
                                "hover:bg-primary/10 hover:border-primary transition-colors"
                              )}
                              onClick={() => {
                                const contextualPrompt = `${template.prompt} This illustration is specifically for a presentation about "${topic}" with the current slide titled "${slideTitle}".`;
                                handleSelectSuggestion(template.label, contextualPrompt);
                              }}
                              disabled={isGenerating}
                            >
                              <IconComponent className="h-5 w-5 text-primary" />
                              <span className="text-[10px] leading-tight text-center">
                                {template.label}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Click a suggestion to preview - modify the prompt below if needed.
              </p>
            </div>

            {/* Pending suggestion confirmation */}
            {pendingSuggestion && (
              <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">
                    Selected: {pendingSuggestion.title}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and modify the prompt below, then click "Generate" when ready.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                {pendingSuggestion ? (
                  <>
                    <Check className="h-4 w-4 text-primary" />
                    Customize Your Prompt
                  </>
                ) : (
                  'Describe Your Image'
                )}
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Clear pending if user modifies
                  if (pendingSuggestion && e.target.value !== pendingSuggestion.prompt) {
                    setPendingSuggestion(null);
                  }
                }}
                onKeyDown={(e) => {
                  // Allow all keys including spacebar - stop propagation to prevent parent handlers
                  e.stopPropagation();
                }}
                placeholder="Describe the image you want to generate...

Example: A simple diagram showing the water cycle with clouds, rain, and ocean."
                className={cn(
                  "min-h-[100px] text-base leading-relaxed resize-none",
                  pendingSuggestion && "border-primary"
                )}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="true"
              />
              <p className="text-sm text-muted-foreground">
                {pendingSuggestion 
                  ? "✏️ Feel free to edit the prompt above before generating."
                  : "💡 Select a topic suggestion above or write your own prompt."
                }
              </p>
            </div>

            <div className="flex gap-2">
              {pendingSuggestion && (
                <Button 
                  variant="outline"
                  onClick={cancelPendingSuggestion} 
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button 
                onClick={pendingSuggestion ? confirmAndGenerate : generateImage} 
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 gap-2 h-12 text-base"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating SVG...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>

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
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                Preview
                {generatedUrl && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Drag to move • Scroll to zoom)
                  </span>
                )}
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
            <div
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-xl overflow-hidden border-2 touch-none transition-colors",
                "min-h-[400px] lg:min-h-[500px]",
                isDropping ? "border-primary border-dashed bg-primary/10" : 
                isDragging ? "border-primary cursor-grabbing" : "border-muted-foreground/30 cursor-default"
              )}
              style={{ aspectRatio: '16/10' }}
            >
              {/* Drop overlay */}
              {isDropping && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm">
                  <div className="text-center">
                    <Upload className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
                    <p className="text-white text-lg font-medium">Drop your image here</p>
                    <p className="text-white/60 text-sm">JPEG or PNG supported</p>
                  </div>
                </div>
              )}

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

              {/* Empty state with drag-drop hint */}
              {!generatedUrl && !isGenerating && !isDropping && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/40 p-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <Image className="h-16 w-16 opacity-50" />
                      <span className="text-2xl opacity-30">or</span>
                      <Upload className="h-16 w-16 opacity-50" />
                    </div>
                    <p className="text-lg mb-2">Generate or upload an image</p>
                    <p className="text-sm">Describe your image and click "Generate", or drag & drop your own artwork</p>
                    <p className="text-xs mt-2 text-white/30">Supports JPEG and PNG</p>
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
