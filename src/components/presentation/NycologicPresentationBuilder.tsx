import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Play, Save, Plus, Trash2, Check, GripVertical, Image, Wand2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { NycologicPresentation, PresentationSlide, VisualTheme } from './NycologicPresents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';
import { SlideImageGenerator, GeneratedImageData } from './SlideImageGenerator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface NycologicPresentationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: {
    topicName: string;
    standard: string;
    subject?: string;
  } | null;
}

// Sortable slide card component
function SortableSlideCard({ 
  slide, 
  index, 
  onLaunch,
  onGenerateImage,
  hasImage,
}: { 
  slide: PresentationSlide; 
  index: number; 
  onLaunch: () => void;
  onGenerateImage: () => void;
  hasImage: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:ring-2 ring-primary transition-all overflow-hidden group relative"
      onClick={onLaunch}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 p-1 rounded bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-white" />
      </div>
      
      {/* Image generation button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onGenerateImage();
        }}
        className="absolute top-2 left-2 z-10 p-1.5 rounded bg-primary/80 hover:bg-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
        title="Generate image for this slide"
      >
        {hasImage ? (
          <Image className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Wand2 className="h-4 w-4 text-primary-foreground" />
        )}
      </button>
      
      <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex flex-col items-center justify-center text-center relative">
        {/* Show image thumbnail if exists */}
        {slide.image?.url && (
          <div className="absolute inset-0 opacity-30">
            <img src={slide.image.url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <Badge variant="outline" className="text-white/50 border-white/20 text-[10px] mb-2 relative z-10">
          {slide.type}
        </Badge>
        <p className="text-white text-sm font-medium line-clamp-2 relative z-10">
          {slide.title.replace(/\*\*/g, '')}
        </p>
        {slide.image?.url && (
          <Badge className="absolute bottom-2 right-2 text-[8px] bg-primary/80">
            <Image className="h-2.5 w-2.5 mr-0.5" />
            Image
          </Badge>
        )}
      </div>
      <CardContent className="p-2">
        <p className="text-xs text-muted-foreground text-center">
          Slide {index + 1}
        </p>
      </CardContent>
    </Card>
  );
}

export function NycologicPresentationBuilder({ open, onOpenChange, topic }: NycologicPresentationBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentation, setPresentation] = useState<NycologicPresentation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageGenSlideIndex, setImageGenSlideIndex] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState(topic?.topicName || '');
  const [subject, setSubject] = useState(topic?.subject || 'Mathematics');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30 minutes');
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [questionCount, setQuestionCount] = useState('3');
  const [style, setStyle] = useState<'engaging' | 'formal' | 'story'>('engaging');
  const [visualTheme, setVisualTheme] = useState<string>('neon-city');

  // Handle image generated for a slide
  const handleSlideImageGenerated = useCallback((imageData: GeneratedImageData) => {
    if (imageGenSlideIndex === null || !presentation) return;
    
    const updatedSlides = [...presentation.slides];
    updatedSlides[imageGenSlideIndex] = {
      ...updatedSlides[imageGenSlideIndex],
      image: imageData.url ? {
        url: imageData.url,
        prompt: imageData.prompt,
        position: imageData.position,
        size: imageData.size,
        rotation: imageData.rotation,
      } : undefined,
    };
    
    setPresentation({ ...presentation, slides: updatedSlides });
    setImageGenSlideIndex(null);
    toast({
      title: imageData.url ? 'Image added to slide' : 'Image removed',
      description: imageData.url ? 'The generated image has been applied.' : 'The slide image has been removed.',
    });
  }, [imageGenSlideIndex, presentation, toast]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle slide reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && presentation) {
      const oldIndex = presentation.slides.findIndex((s) => s.id === active.id);
      const newIndex = presentation.slides.findIndex((s) => s.id === over.id);

      const newSlides = arrayMove(presentation.slides, oldIndex, newIndex);
      setPresentation({
        ...presentation,
        slides: newSlides,
      });
      toast({
        title: 'Slides reordered',
        description: `Moved slide ${oldIndex + 1} to position ${newIndex + 1}`,
      });
    }
  }, [presentation, toast]);

  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);

  // Visual theme options with colorful designs - include background hex colors for preview
  const visualThemes = [
    {
      id: 'neon-city',
      name: 'Neon City',
      description: 'Vibrant NYC skyline vibes',
      gradient: 'from-purple-600 via-pink-500 to-orange-400',
      accent: 'bg-pink-500',
      emoji: '🌆',
      pattern: 'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.4) 0%, transparent 50%)',
      bgHex: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)',
      accentHex: '#ec4899',
    },
    {
      id: 'ocean-wave',
      name: 'Ocean Wave',
      description: 'Cool and calming blues',
      gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
      accent: 'bg-cyan-400',
      emoji: '🌊',
      pattern: 'radial-gradient(circle at 30% 70%, rgba(34, 211, 238, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
      bgHex: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #4f46e5 100%)',
      accentHex: '#22d3ee',
    },
    {
      id: 'sunset-glow',
      name: 'Sunset Glow',
      description: 'Warm golden hour colors',
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      accent: 'bg-amber-400',
      emoji: '🌅',
      pattern: 'radial-gradient(circle at 50% 100%, rgba(251, 191, 36, 0.4) 0%, transparent 50%), radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.3) 0%, transparent 50%)',
      bgHex: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #f43f5e 100%)',
      accentHex: '#fbbf24',
    },
    {
      id: 'forest-zen',
      name: 'Forest Zen',
      description: 'Natural earthy greens',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      accent: 'bg-emerald-400',
      emoji: '🌿',
      pattern: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(20, 184, 166, 0.4) 0%, transparent 50%)',
      bgHex: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%)',
      accentHex: '#34d399',
    },
    {
      id: 'galaxy-dreams',
      name: 'Galaxy Dreams',
      description: 'Deep space exploration',
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
      accent: 'bg-violet-400',
      emoji: '✨',
      pattern: 'radial-gradient(circle at 10% 10%, rgba(139, 92, 246, 0.5) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(192, 38, 211, 0.4) 0%, transparent 40%)',
      bgHex: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #d946ef 100%)',
      accentHex: '#a78bfa',
    },
    {
      id: 'candy-pop',
      name: 'Candy Pop',
      description: 'Fun and playful pastels',
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      accent: 'bg-rose-300',
      emoji: '🍭',
      pattern: 'radial-gradient(circle at 25% 25%, rgba(244, 114, 182, 0.4) 0%, transparent 40%), radial-gradient(circle at 75% 75%, rgba(251, 113, 133, 0.4) 0%, transparent 40%)',
      bgHex: 'linear-gradient(135deg, #f472b6 0%, #fb7185 50%, #f87171 100%)',
      accentHex: '#fda4af',
    },
  ];

  // Get selected theme for preview
  const selectedThemeData = visualThemes.find(t => t.id === visualTheme);

  const generatePresentation = async () => {
    if (!title.trim()) {
      toast({
        title: 'Missing topic',
        description: 'Please enter a topic for your presentation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-nycologic-presentation', {
        body: {
          topic: title,
          subject,
          description,
          duration,
          includeQuestions,
          questionCount: parseInt(questionCount),
          style,
          standard: topic?.standard,
        },
      });

      if (error) throw error;

      if (data.presentation) {
        // Attach the selected visual theme to the presentation
        const selectedTheme = visualThemes.find(t => t.id === visualTheme);
        const presentationWithTheme: NycologicPresentation = {
          ...data.presentation,
          visualTheme: selectedTheme ? {
            id: selectedTheme.id,
            name: selectedTheme.name,
            gradient: selectedTheme.gradient,
            accent: selectedTheme.accent,
            pattern: selectedTheme.pattern,
          } : undefined,
        };
        setPresentation(presentationWithTheme);
        toast({
          title: 'Presentation generated!',
          description: `Created ${data.presentation.slides.length} beautiful slides with ${selectedTheme?.name || 'default'} theme.`,
        });
      }
    } catch (error) {
      console.error('Error generating presentation:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate presentation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePresentation = async () => {
    if (!presentation || !user) {
      toast({
        title: 'Cannot save',
        description: 'Please log in to save presentations.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('nycologic_presentations').insert([{
        teacher_id: user.id,
        title: presentation.title,
        subtitle: presentation.subtitle || '',
        topic: presentation.topic,
        slides: presentation.slides as any,
        visual_theme: presentation.visualTheme as any,
      }]);

      if (error) throw error;

      toast({
        title: 'Presentation saved!',
        description: 'You can find it in your presentation library.',
      });
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const launchPresentation = () => {
    if (presentation) {
      // Store presentation in sessionStorage and navigate to full-page view
      sessionStorage.setItem('nycologic_presentation', JSON.stringify(presentation));
      onOpenChange(false);
      navigate('/presentation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col z-50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <img src={nyclogicLogo} alt="NYClogic" className="h-6 w-6" />
            NYClogic PRESENTS: Create Presentation
          </DialogTitle>
          <DialogDescription>
            Generate a stunning, interactive presentation that's more engaging than PowerPoint.
            Teachers can edit all text and customize the content.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 pb-4">
            {/* Generation Form */}
            {!presentation && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Presentation Topic *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Solving Quadratic Equations"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Algebra">Algebra</SelectItem>
                        <SelectItem value="Geometry">Geometry</SelectItem>
                        <SelectItem value="Statistics">Statistics</SelectItem>
                        <SelectItem value="Calculus">Calculus</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Financial Literacy">Financial Literacy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Additional Details (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Any specific topics, examples, or focus areas you want to include..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Presentation Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 minutes">15 minutes (5-7 slides)</SelectItem>
                        <SelectItem value="30 minutes">30 minutes (8-12 slides)</SelectItem>
                        <SelectItem value="45 minutes">45 minutes (12-16 slides)</SelectItem>
                        <SelectItem value="60 minutes">60 minutes (16-20 slides)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Presentation Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engaging">Engaging & Interactive</SelectItem>
                        <SelectItem value="formal">Formal & Academic</SelectItem>
                        <SelectItem value="story">Story-based Learning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {topic?.standard && (
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        Standard: {topic.standard}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual Theme Selection */}
            {!presentation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Choose Your Visual Theme
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {showPreview ? 'Hide Preview' : 'Preview Theme'}
                  </Button>
                </div>

                {/* Theme Preview Panel */}
                {showPreview && selectedThemeData && (
                  <Card className="overflow-hidden border-2 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>{selectedThemeData.emoji}</span>
                        Preview: {selectedThemeData.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Mini slide preview */}
                      <div 
                        className="aspect-video rounded-lg overflow-hidden shadow-xl relative"
                        style={{ background: selectedThemeData.bgHex }}
                      >
                        {/* Pattern overlay */}
                        <div 
                          className="absolute inset-0 opacity-60"
                          style={{ backgroundImage: selectedThemeData.pattern }}
                        />
                        
                        {/* Animated particles */}
                        <div className="absolute inset-0 overflow-hidden">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 rounded-full bg-white/40 animate-pulse"
                              style={{
                                left: `${15 + i * 18}%`,
                                top: `${20 + (i % 3) * 25}%`,
                                animationDelay: `${i * 0.2}s`,
                              }}
                            />
                          ))}
                        </div>

                        {/* Sample slide content */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-center">
                          <img src={nyclogicLogo} alt="NYClogic" className="h-8 w-8 mb-3 drop-shadow-lg" />
                          <h3 className="text-white text-lg font-bold drop-shadow-lg mb-2">
                            {title || 'Your Presentation Title'}
                          </h3>
                          <p className="text-white/80 text-sm drop-shadow mb-4">
                            {subject || 'Mathematics'}
                          </p>
                          <div 
                            className="px-4 py-2 rounded-full text-white text-xs font-semibold shadow-lg"
                            style={{ backgroundColor: selectedThemeData.accentHex }}
                          >
                            Sample Button
                          </div>
                        </div>

                        {/* Bottom gradient */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                        
                        {/* Corner decoration */}
                        <div 
                          className="absolute top-0 right-0 w-24 h-24 opacity-30"
                          style={{ 
                            background: `radial-gradient(circle at 100% 0%, ${selectedThemeData.accentHex} 0%, transparent 70%)` 
                          }}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground text-center mt-3">
                        This is how your slides will look with the <strong>{selectedThemeData.name}</strong> theme
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {visualThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setVisualTheme(theme.id)}
                      className={`relative group overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] ${
                        visualTheme === theme.id
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-1 hover:ring-primary/50'
                      }`}
                    >
                      {/* Gradient background */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-90`}
                        style={{ backgroundImage: theme.pattern }}
                      />
                      
                      {/* Animated particles */}
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-white/30 animate-pulse"
                            style={{
                              left: `${20 + i * 30}%`,
                              top: `${30 + i * 20}%`,
                              animationDelay: `${i * 0.3}s`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Content */}
                      <div className="relative z-10">
                        <span className="text-2xl mb-2 block">{theme.emoji}</span>
                        <h4 className="font-bold text-white text-sm drop-shadow-md">
                          {theme.name}
                        </h4>
                        <p className="text-white/80 text-xs mt-1 drop-shadow">
                          {theme.description}
                        </p>
                      </div>

                      {/* Selected checkmark */}
                      {visualTheme === theme.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A Options */}
            {!presentation && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeQuestions"
                    checked={includeQuestions}
                    onChange={(e) => setIncludeQuestions(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeQuestions" className="text-sm cursor-pointer">
                    Include Q&A slides
                  </Label>
                </div>
                {includeQuestions && (
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Preview section */}
            {presentation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{presentation.title}</h3>
                    <p className="text-sm text-muted-foreground">{presentation.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPresentation(null)}
                    >
                      Start Over
                    </Button>
                    <Button
                      variant="outline"
                      onClick={savePresentation}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button onClick={launchPresentation}>
                      <Play className="h-4 w-4 mr-2" />
                      Present
                    </Button>
                  </div>
                </div>

                {/* Slide preview grid - draggable */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    Drag slides to reorder them
                  </p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={presentation.slides.map(s => s.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-3 gap-4">
                        {presentation.slides.map((slide, index) => (
                          <SortableSlideCard
                            key={slide.id}
                            slide={slide}
                            index={index}
                            onLaunch={launchPresentation}
                            onGenerateImage={() => setImageGenSlideIndex(index)}
                            hasImage={!!slide.image?.url}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Slide Image Generator Dialog */}
                  {imageGenSlideIndex !== null && presentation.slides[imageGenSlideIndex] && (
                    <SlideImageGenerator
                      open={imageGenSlideIndex !== null}
                      onOpenChange={(open) => !open && setImageGenSlideIndex(null)}
                      onImageGenerated={handleSlideImageGenerated}
                      currentImage={presentation.slides[imageGenSlideIndex].image ? {
                        url: presentation.slides[imageGenSlideIndex].image!.url,
                        prompt: presentation.slides[imageGenSlideIndex].image!.prompt,
                        position: presentation.slides[imageGenSlideIndex].image!.position,
                        size: presentation.slides[imageGenSlideIndex].image!.size,
                        rotation: presentation.slides[imageGenSlideIndex].image!.rotation,
                      } : null}
                      slideTitle={presentation.slides[imageGenSlideIndex].title}
                      topic={presentation.topic}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        {!presentation && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={generatePresentation}
              disabled={isGenerating || !title.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Presentation
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
