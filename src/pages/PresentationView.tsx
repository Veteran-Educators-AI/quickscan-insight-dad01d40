import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, Sparkles, BookOpen, Lightbulb, HelpCircle, Award, Home, LayoutGrid, PanelLeftClose, Pencil, Save, Check, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Cloud, CloudOff, Library, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';
import { SlideImageGenerator, GeneratedImageData } from '@/components/presentation/SlideImageGenerator';

interface PresentationSlide {
  id: string;
  type: 'title' | 'content' | 'question' | 'reveal' | 'summary' | 'interactive';
  title: string;
  subtitle?: string;
  content: string[];
  speakerNotes?: string;
  question?: {
    prompt: string;
    options?: string[];
    answer?: string;
    explanation?: string;
  };
  icon?: 'lightbulb' | 'book' | 'question' | 'award' | 'sparkles';
  generatedImage?: string;
  customImage?: GeneratedImageData;
}

interface VisualTheme {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  pattern: string;
}

interface NycologicPresentation {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  slides: PresentationSlide[];
  createdAt: Date;
  visualTheme?: VisualTheme;
}

const slideIcons = {
  lightbulb: Lightbulb,
  book: BookOpen,
  question: HelpCircle,
  award: Award,
  sparkles: Sparkles,
};

// Theme color schemes
const themeColors: Record<string, { bg: string; accent: string; glow: string }> = {
  'neon-city': { bg: 'from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e]', accent: 'text-fuchsia-400', glow: 'rgba(217, 70, 239, 0.15)' },
  'ocean-wave': { bg: 'from-[#0a1628] via-[#0f2847] to-[#0a1628]', accent: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.15)' },
  'sunset-glow': { bg: 'from-[#1a0a0a] via-[#2d1b1b] to-[#1a0a0a]', accent: 'text-amber-400', glow: 'rgba(251, 191, 36, 0.15)' },
  'forest-zen': { bg: 'from-[#0a1a0a] via-[#1b2d1b] to-[#0a1a0a]', accent: 'text-emerald-400', glow: 'rgba(52, 211, 153, 0.15)' },
  'galaxy-dreams': { bg: 'from-[#0f0a1a] via-[#1a0f2e] to-[#0f0a1a]', accent: 'text-violet-400', glow: 'rgba(167, 139, 250, 0.15)' },
  'candy-pop': { bg: 'from-[#1a0a14] via-[#2d1b24] to-[#1a0a14]', accent: 'text-rose-400', glow: 'rgba(251, 113, 133, 0.15)' },
};

const defaultColors = { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', glow: 'rgba(251, 191, 36, 0.15)' };

export default function PresentationView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [presentation, setPresentation] = useState<NycologicPresentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showImageGenerator, setShowImageGenerator] = useState(false);

  // Load presentation from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('nycologic_presentation');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPresentation(data);
        setIsLoading(false);
        // Generate images for slides
        generateSlideImages(data);
      } catch (e) {
        console.error('Failed to parse presentation:', e);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Generate AI images for each slide topic
  const generateSlideImages = async (pres: NycologicPresentation) => {
    setIsGeneratingImages(true);
    const images: Record<number, string> = {};

    for (let i = 0; i < pres.slides.length; i++) {
      const slide = pres.slides[i];
      // Generate image based on slide title/content
      const prompt = `Create a professional, elegant illustration for an educational presentation slide about "${slide.title}". Topic: ${pres.topic}. Style: modern, minimalist, professional, suitable for classroom. Dark theme with subtle glow effects. No text in image.`;
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
          body: {
            prompt,
            style: 'clipart',
          },
        });

        if (!error && data?.imageUrl) {
          images[i] = data.imageUrl;
          setSlideImages(prev => ({ ...prev, [i]: data.imageUrl }));
        }
      } catch (e) {
        console.error(`Failed to generate image for slide ${i}:`, e);
      }
    }

    setIsGeneratingImages(false);
  };

  const slide = presentation?.slides[currentSlide];
  const totalSlides = presentation?.slides.length || 0;
  const themeId = presentation?.visualTheme?.id || 'sunset-glow';
  const colors = themeColors[themeId] || defaultColors;
  const IconComponent = slide?.icon ? slideIcons[slide.icon] : null;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
      setShowAnswer(false);
      setSelectedOption(null);
    }
  }, [totalSlides]);

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            navigate(-1);
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          setShowSidebar(prev => !prev);
          break;
        case 'e':
        case 'E':
          if (!editingField) {
            toggleEditMode();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, nextSlide, prevSlide, navigate]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    setTimeout(() => setShowAnswer(true), 500);
  };

  // Update slide content
  const updateSlide = (field: string, value: string | string[]) => {
    if (!presentation) return;
    const updatedSlides = [...presentation.slides];
    const currentSlideData = updatedSlides[currentSlide];
    
    if (field === 'content') {
      updatedSlides[currentSlide] = { ...currentSlideData, content: value as string[] };
    } else if (field === 'title') {
      updatedSlides[currentSlide] = { ...currentSlideData, title: value as string };
    } else if (field === 'subtitle') {
      updatedSlides[currentSlide] = { ...currentSlideData, subtitle: value as string };
    } else if (field.startsWith('question.')) {
      const questionField = field.split('.')[1];
      updatedSlides[currentSlide] = { 
        ...currentSlideData, 
        question: { ...currentSlideData.question!, [questionField]: value }
      };
    }
    
    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);
    // Update sessionStorage so changes persist
    sessionStorage.setItem('nycologic_presentation', JSON.stringify(updatedPresentation));
  };

  const updateContentItem = (index: number, value: string) => {
    if (!slide) return;
    const newContent = [...slide.content];
    newContent[index] = value;
    updateSlide('content', newContent);
  };

  const addContentItem = () => {
    if (!slide) return;
    const newContent = [...slide.content, 'New bullet point'];
    updateSlide('content', newContent);
    // Set focus to the new item
    setTimeout(() => setEditingField(`content-item-${newContent.length - 1}`), 100);
  };

  const removeContentItem = (index: number) => {
    if (!slide || slide.content.length <= 1) return;
    const newContent = slide.content.filter((_, i) => i !== index);
    updateSlide('content', newContent);
    setEditingField(null);
  };

  const deleteSlide = (slideIndex: number) => {
    if (!presentation || presentation.slides.length <= 1) {
      toast.error('Cannot delete the only slide');
      return;
    }
    
    const updatedSlides = presentation.slides.filter((_, i) => i !== slideIndex);
    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);
    sessionStorage.setItem('nycologic_presentation', JSON.stringify(updatedPresentation));
    
    // Adjust current slide if needed
    if (currentSlide >= updatedSlides.length) {
      setCurrentSlide(updatedSlides.length - 1);
    } else if (currentSlide > slideIndex) {
      setCurrentSlide(currentSlide - 1);
    }
    
    toast.success('Slide deleted');
  };

  const moveSlide = (fromIndex: number, direction: 'up' | 'down') => {
    if (!presentation) return;
    
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= presentation.slides.length) return;
    
    const updatedSlides = [...presentation.slides];
    const [movedSlide] = updatedSlides.splice(fromIndex, 1);
    updatedSlides.splice(toIndex, 0, movedSlide);
    
    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);
    sessionStorage.setItem('nycologic_presentation', JSON.stringify(updatedPresentation));
    
    // Keep focus on the moved slide
    if (currentSlide === fromIndex) {
      setCurrentSlide(toIndex);
    } else if (currentSlide === toIndex) {
      setCurrentSlide(fromIndex);
    }
  };

  const toggleEditMode = () => {
    if (isEditing) {
      toast.success('Changes saved locally!');
    }
    setIsEditing(!isEditing);
    setEditingField(null);
  };

  // Handle custom image generation for current slide
  const handleImageGenerated = (imageData: GeneratedImageData) => {
    if (!presentation) return;
    const updatedSlides = [...presentation.slides];
    if (imageData.url) {
      updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], customImage: imageData };
    } else {
      // Remove image
      const { customImage, ...rest } = updatedSlides[currentSlide];
      updatedSlides[currentSlide] = rest;
    }
    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);
    sessionStorage.setItem('nycologic_presentation', JSON.stringify(updatedPresentation));
    toast.success(imageData.url ? 'Image added to slide!' : 'Image removed from slide');
  };

  // Auto-save to database when presentation changes (debounced)
  useEffect(() => {
    if (!presentation || !user || !savedToCloud) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('nycologic_presentations')
          .update({
            slides: presentation.slides as any,
            title: presentation.title,
            subtitle: presentation.subtitle || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', presentation.id)
          .eq('teacher_id', user.id);
        
        if (error) throw error;
        setLastSavedAt(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [presentation, user, savedToCloud]);

  // Save presentation to user's account
  const saveToAccount = async () => {
    if (!presentation || !user) {
      toast.error('Please log in to save presentations');
      return;
    }

    setIsSaving(true);
    try {
      // Check if this presentation is already saved
      const { data: existing } = await supabase
        .from('nycologic_presentations')
        .select('id')
        .eq('teacher_id', user.id)
        .eq('title', presentation.title)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('nycologic_presentations')
          .update({
            slides: presentation.slides as any,
            subtitle: presentation.subtitle || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        
        if (error) throw error;
        
        // Update local presentation with the database ID
        setPresentation({ ...presentation, id: existing.id });
        sessionStorage.setItem('nycologic_presentation', JSON.stringify({ ...presentation, id: existing.id }));
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('nycologic_presentations')
          .insert([{
            teacher_id: user.id,
            title: presentation.title,
            subtitle: presentation.subtitle || '',
            topic: presentation.topic,
            slides: presentation.slides as any,
          }])
          .select()
          .single();
        
        if (error) throw error;
        
        // Update local presentation with the new database ID
        if (data) {
          setPresentation({ ...presentation, id: data.id });
          sessionStorage.setItem('nycologic_presentation', JSON.stringify({ ...presentation, id: data.id }));
        }
      }

      setSavedToCloud(true);
      setLastSavedAt(new Date());
      toast.success('Presentation saved to your account!');
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast.error('Failed to save presentation');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !presentation || !slide) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-white/60">Loading presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("min-h-screen w-full overflow-hidden relative", `bg-gradient-to-br ${colors.bg}`)}
      style={{ minHeight: '100vh' }}
    >
      {/* Ambient glow effects */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${colors.glow} 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${colors.glow} 0%, transparent 50%)`,
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              background: colors.glow.replace('0.15', '0.4'),
            }}
            initial={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`,
              opacity: 0 
            }}
            animate={{ 
              y: [`${Math.random() * 100}%`, `${Math.random() * 100 - 30}%`],
              opacity: [0, 0.6, 0],
            }}
            transition={{ 
              duration: 8 + Math.random() * 6, 
              repeat: Infinity,
              delay: Math.random() * 5 
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 lg:px-16 py-6 z-20">
        <div className="flex items-center gap-6">
          <img 
            src={nyclogicLogo} 
            alt="NYClogic" 
            className="h-12 w-12 lg:h-16 lg:w-16 drop-shadow-2xl"
          />
          <div className="hidden md:block">
            <p className={cn("text-xs lg:text-sm font-bold tracking-[0.3em] uppercase", colors.accent)}>
              NYClogic PRESENTS
            </p>
            <p className="text-white/40 text-xs mt-1 tracking-wide">
              {presentation.topic}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Presentation Library Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/presentation/library')}
            className="h-10 px-4 rounded-full text-white/60 hover:text-white hover:bg-white/10 gap-2"
            title="Presentation Library"
          >
            <Library className="h-4 w-4" />
            <span className="hidden md:inline text-sm">Library</span>
          </Button>
          
          {/* Generate Image Button (Edit mode only) */}
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => setShowImageGenerator(true)}
              className="h-10 px-4 rounded-full text-white/60 hover:text-white hover:bg-white/10 gap-2"
              title="Generate image for this slide"
            >
              <ImagePlus className="h-4 w-4" />
              <span className="hidden md:inline text-sm">Add Image</span>
            </Button>
          )}
          
          {/* Save to Cloud Button */}
          <Button
            variant="ghost"
            onClick={saveToAccount}
            disabled={isSaving}
            className={cn(
              "h-10 px-4 rounded-full transition-all gap-2",
              savedToCloud 
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            title={savedToCloud ? `Auto-saving • Last saved ${lastSavedAt?.toLocaleTimeString() || 'now'}` : "Save to your account"}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedToCloud ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <CloudOff className="h-4 w-4" />
            )}
            <span className="hidden md:inline text-sm">
              {isSaving ? 'Saving...' : savedToCloud ? 'Saved' : 'Save'}
            </span>
          </Button>
          
          {/* Edit Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleEditMode}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              isEditing 
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            title={isEditing ? "Save changes (E)" : "Edit slides (E)"}
          >
            {isEditing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(prev => !prev)}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              showSidebar 
                ? `${colors.accent} bg-white/10` 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            title="Toggle thumbnails (T)"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
          >
            <Home className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Slide Thumbnail Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 z-30 bg-black/80 backdrop-blur-xl border-r border-white/10"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className={cn("font-semibold text-sm tracking-wide", colors.accent)}>
                Slides
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="overflow-y-auto h-[calc(100vh-60px)] p-3 space-y-3">
              {presentation.slides.map((s, idx) => (
                <div key={s.id} className="group relative">
                  <motion.button
                    onClick={() => {
                      goToSlide(idx);
                      if (!isEditing) setShowSidebar(false);
                    }}
                    whileHover={{ scale: isEditing ? 1 : 1.02 }}
                    whileTap={{ scale: isEditing ? 1 : 0.98 }}
                    className={cn(
                      "w-full rounded-lg overflow-hidden transition-all duration-200 text-left",
                      "border-2",
                      idx === currentSlide
                        ? `${colors.accent.replace('text-', 'border-')} ring-2 ${colors.accent.replace('text-', 'ring-').replace('-400', '-400/30')}`
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    {/* Thumbnail preview */}
                    <div 
                      className={cn(
                        "aspect-video w-full p-3 flex items-center justify-center relative",
                        `bg-gradient-to-br ${colors.bg}`
                      )}
                      style={{
                        background: colors.glow ? `linear-gradient(135deg, ${colors.glow.replace('0.15', '0.3')}, transparent)` : undefined,
                      }}
                    >
                      {slideImages[idx] ? (
                        <img 
                          src={slideImages[idx]} 
                          alt={s.title}
                          className="h-full w-full object-contain rounded"
                        />
                      ) : s.icon && slideIcons[s.icon] ? (
                        <div className={cn("h-8 w-8", colors.accent)}>
                          {(() => {
                            const Icon = slideIcons[s.icon!];
                            return <Icon className="h-full w-full" />;
                          })()}
                        </div>
                      ) : (
                        <span className={cn("text-2xl font-bold", colors.accent)}>
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    
                    {/* Slide info */}
                    <div className="p-2.5 bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex-shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center",
                          idx === currentSlide
                            ? `${colors.accent.replace('text-', 'bg-')} text-black`
                            : "bg-white/20 text-white/70"
                        )}>
                          {idx + 1}
                        </span>
                        <p className="text-white text-xs font-medium truncate flex-1">
                          {s.title}
                        </p>
                      </div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wide mt-1 ml-7">
                        {s.type}
                      </p>
                    </div>
                  </motion.button>
                  
                  {/* Edit mode controls */}
                  {isEditing && (
                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className={cn(
                          "h-6 w-6 rounded flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all",
                          idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20 text-white/80 hover:text-white"
                        )}
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(idx, 'down');
                        }}
                        disabled={idx === presentation.slides.length - 1}
                        className={cn(
                          "h-6 w-6 rounded flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all",
                          idx === presentation.slides.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20 text-white/80 hover:text-white"
                        )}
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(idx);
                        }}
                        disabled={presentation.slides.length <= 1}
                        className={cn(
                          "h-6 w-6 rounded flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all",
                          presentation.slides.length <= 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-red-500/40 text-red-400 hover:text-red-300"
                        )}
                        title="Delete slide"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={cn(
          "absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-20",
          "w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center",
          "transition-all duration-300 border-2",
          currentSlide === 0 
            ? "opacity-20 cursor-not-allowed border-white/10" 
            : "border-white/20 hover:border-current text-white/50 hover:text-current hover:scale-110",
          colors.accent.replace('text-', 'hover:border-').replace('-400', '-400/60')
        )}
      >
        <ChevronLeft className="h-6 w-6 lg:h-8 lg:w-8" />
      </button>

      <button
        onClick={nextSlide}
        disabled={currentSlide === totalSlides - 1}
        className={cn(
          "absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-20",
          "w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center",
          "transition-all duration-300 border-2",
          currentSlide === totalSlides - 1 
            ? "opacity-20 cursor-not-allowed border-white/10" 
            : "border-white/20 hover:border-current text-white/50 hover:text-current hover:scale-110",
          colors.accent.replace('text-', 'hover:border-').replace('-400', '-400/60')
        )}
      >
        <ChevronRight className="h-6 w-6 lg:h-8 lg:w-8" />
      </button>

      {/* Main content area */}
      <main className="min-h-screen flex items-center justify-center px-20 lg:px-40 py-24 lg:py-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-6xl mx-auto"
          >
            {/* Slide content based on type */}
            {slide.type === 'title' ? (
              <div className="text-center space-y-8 relative">
                {/* Custom Generated Image (positioned by user) */}
                {slide.customImage?.url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      position: 'absolute',
                      left: `${slide.customImage.position.x}%`,
                      top: `${slide.customImage.position.y}%`,
                      transform: `translate(-50%, -50%) rotate(${slide.customImage.rotation}deg)`,
                      width: `${slide.customImage.size.width}px`,
                      height: `${slide.customImage.size.height}px`,
                      zIndex: 10,
                    }}
                    className="pointer-events-none"
                  >
                    <img 
                      src={slide.customImage.url} 
                      alt="Slide image"
                      className="w-full h-full object-contain rounded-2xl shadow-2xl"
                      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                    />
                  </motion.div>
                )}
                
                {/* AI Auto-generated image (only show if no custom image) */}
                {!slide.customImage?.url && slideImages[currentSlide] && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mx-auto mb-8"
                  >
                    <img 
                      src={slideImages[currentSlide]} 
                      alt={slide.title}
                      className="h-40 lg:h-56 mx-auto object-contain rounded-2xl shadow-2xl"
                      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                    />
                  </motion.div>
                )}
                {isGeneratingImages && !slideImages[currentSlide] && !slide.customImage?.url && (
                  <div className="h-40 lg:h-56 flex items-center justify-center">
                    <Loader2 className={cn("h-8 w-8 animate-spin", colors.accent)} />
                  </div>
                )}

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
                >
                  {isEditing && editingField === 'title' ? (
                    <Textarea
                      value={slide.title}
                      onChange={(e) => updateSlide('title', e.target.value)}
                      onBlur={() => setEditingField(null)}
                      autoFocus
                      className="bg-white/10 border-white/20 text-white text-center text-4xl md:text-5xl font-bold resize-none min-h-[80px]"
                    />
                  ) : (
                    <span 
                      onClick={() => isEditing && setEditingField('title')}
                      className={cn(isEditing && 'cursor-text hover:bg-white/5 px-4 py-2 rounded-lg transition-colors')}
                    >
                      {slide.title}
                    </span>
                  )}
                </motion.h1>

                {(slide.subtitle || isEditing) && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={cn("text-xl lg:text-2xl font-medium tracking-wide", colors.accent)}
                  >
                    {isEditing && editingField === 'subtitle' ? (
                      <Input
                        value={slide.subtitle || ''}
                        onChange={(e) => updateSlide('subtitle', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        placeholder="Add subtitle..."
                        className="bg-white/10 border-white/20 text-center max-w-md mx-auto"
                      />
                    ) : (
                      <span 
                        onClick={() => isEditing && setEditingField('subtitle')}
                        className={cn(isEditing && 'cursor-text hover:bg-white/5 px-4 py-2 rounded-lg transition-colors')}
                      >
                        {slide.subtitle || (isEditing ? 'Click to add subtitle' : '')}
                      </span>
                    )}
                  </motion.p>
                )}

                {(slide.content.length > 0 || isEditing) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-white/60 text-lg lg:text-xl max-w-3xl mx-auto"
                  >
                    {isEditing && editingField === 'content-0' ? (
                      <Textarea
                        value={slide.content[0] || ''}
                        onChange={(e) => updateContentItem(0, e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        placeholder="Add content..."
                        className="bg-white/10 border-white/20 text-white/80 text-center resize-none min-h-[60px]"
                      />
                    ) : (
                      <span 
                        onClick={() => isEditing && setEditingField('content-0')}
                        className={cn(isEditing && 'cursor-text hover:bg-white/5 px-4 py-2 rounded-lg transition-colors block')}
                      >
                        {slide.content[0] || (isEditing ? 'Click to add content' : '')}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            ) : slide.type === 'question' ? (
              <div className="space-y-10">
                <div className="text-center">
                  {IconComponent && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mx-auto mb-6"
                    >
                      <IconComponent className={cn("h-12 w-12 lg:h-16 lg:w-16", colors.accent)} />
                    </motion.div>
                  )}

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
                  >
                    {isEditing && editingField === 'question-title' ? (
                      <Input
                        value={slide.title}
                        onChange={(e) => updateSlide('title', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        className="bg-white/10 border-white/20 text-white text-center text-2xl font-bold"
                      />
                    ) : (
                      <span 
                        onClick={() => isEditing && setEditingField('question-title')}
                        className={cn(isEditing && 'cursor-text hover:bg-white/5 px-4 py-2 rounded-lg transition-colors')}
                      >
                        {slide.title}
                      </span>
                    )}
                  </motion.h2>

                  {slide.question && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/10 mt-8"
                    >
                      {isEditing && editingField === 'question-prompt' ? (
                        <Textarea
                          value={slide.question.prompt}
                          onChange={(e) => updateSlide('question.prompt', e.target.value)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          className="bg-white/10 border-white/20 text-white/90 text-xl resize-none min-h-[80px]"
                        />
                      ) : (
                        <p 
                          onClick={() => isEditing && setEditingField('question-prompt')}
                          className={cn(
                            "text-xl lg:text-2xl text-white/90",
                            isEditing && 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors'
                          )}
                        >
                          {slide.question.prompt}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Touch-friendly Options - Big and Interactive */}
                {slide.question?.options && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto px-4"
                  >
                    {slide.question.options.map((option, idx) => {
                      const letters = ['A', 'B', 'C', 'D'];
                      const isSelected = selectedOption === idx;
                      const isCorrect = showAnswer && option === slide.question?.answer;
                      const isWrong = showAnswer && isSelected && option !== slide.question?.answer;

                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          whileHover={{ scale: 1.03, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "relative flex items-center gap-6 p-8 lg:p-10 rounded-2xl text-left transition-all duration-300",
                            "border-3 backdrop-blur-sm shadow-xl touch-manipulation",
                            "min-h-[100px] lg:min-h-[120px]",
                            isCorrect 
                              ? "border-emerald-400 bg-emerald-500/30 shadow-emerald-500/20" 
                              : isWrong
                                ? "border-red-400 bg-red-500/30 shadow-red-500/20"
                                : isSelected
                                  ? "border-white/50 bg-white/15 shadow-white/10"
                                  : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 hover:shadow-2xl active:bg-white/15"
                          )}
                          style={{ 
                            borderWidth: '3px',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {/* Large Letter Circle */}
                          <span className={cn(
                            "flex-shrink-0 inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-full font-bold text-2xl lg:text-3xl transition-all",
                            isCorrect ? "bg-emerald-400 text-white scale-110" :
                            isWrong ? "bg-red-400 text-white scale-110" :
                            isSelected ? "bg-white/30 text-white scale-105" :
                            "bg-white/10 text-white/70"
                          )}>
                            {letters[idx]}
                          </span>
                          
                          {/* Option Text */}
                          <span className="text-white text-xl lg:text-2xl font-medium leading-tight flex-1">
                            {option}
                          </span>

                          {/* Selection indicator */}
                          {isCorrect && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-4 right-4 w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center"
                            >
                              <Check className="h-5 w-5 text-white" />
                            </motion.div>
                          )}
                          {isWrong && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-4 right-4 w-8 h-8 bg-red-400 rounded-full flex items-center justify-center"
                            >
                              <X className="h-5 w-5 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Answer reveal - Larger and more prominent */}
                {showAnswer && slide.question?.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="max-w-4xl mx-auto p-8 lg:p-10 rounded-3xl bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/10"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-400/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-emerald-400" />
                      </div>
                      <h4 className="text-emerald-400 font-bold text-xl lg:text-2xl">Correct Answer: {slide.question.answer}</h4>
                    </div>
                    <p className="text-white/90 text-lg lg:text-xl leading-relaxed">{slide.question.explanation}</p>
                  </motion.div>
                )}
              </div>
            ) : (
              // Content/Summary/Other slides
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                {/* Image side */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  {slideImages[currentSlide] ? (
                    <img 
                      src={slideImages[currentSlide]} 
                      alt={slide.title}
                      className="w-48 h-48 lg:w-72 lg:h-72 object-contain rounded-2xl"
                      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))' }}
                    />
                  ) : isGeneratingImages ? (
                    <div className="w-48 h-48 lg:w-72 lg:h-72 flex items-center justify-center bg-white/5 rounded-2xl">
                      <Loader2 className={cn("h-10 w-10 animate-spin", colors.accent)} />
                    </div>
                  ) : IconComponent ? (
                    <div className="w-48 h-48 lg:w-72 lg:h-72 flex items-center justify-center bg-white/5 rounded-2xl">
                      <IconComponent className={cn("h-24 w-24", colors.accent)} />
                    </div>
                  ) : null}
                </motion.div>

                {/* Content side */}
                <div className="flex-1 space-y-6 text-center lg:text-left">
                  {(slide.subtitle || isEditing) && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-sm font-bold tracking-[0.25em] uppercase", colors.accent)}
                    >
                      {isEditing && editingField === 'content-subtitle' ? (
                        <Input
                          value={slide.subtitle || ''}
                          onChange={(e) => updateSlide('subtitle', e.target.value)}
                          onBlur={() => setEditingField(null)}
                          autoFocus
                          placeholder="Add subtitle..."
                          className="bg-white/10 border-white/20 text-sm uppercase"
                        />
                      ) : (
                        <span 
                          onClick={() => isEditing && setEditingField('content-subtitle')}
                          className={cn(isEditing && 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors')}
                        >
                          {slide.subtitle || (isEditing ? 'Click to add subtitle' : '')}
                        </span>
                      )}
                    </motion.p>
                  )}

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                  >
                    {isEditing && editingField === 'content-title' ? (
                      <Textarea
                        value={slide.title}
                        onChange={(e) => updateSlide('title', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        className="bg-white/10 border-white/20 text-white text-2xl font-bold resize-none min-h-[60px]"
                      />
                    ) : (
                      <span 
                        onClick={() => isEditing && setEditingField('content-title')}
                        className={cn(isEditing && 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors')}
                      >
                        {slide.title}
                      </span>
                    )}
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    {slide.content.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className="flex items-start gap-4 group"
                      >
                        <span className={cn("w-2 h-2 rounded-full mt-3 flex-shrink-0", colors.accent.replace('text-', 'bg-'))} />
                        {isEditing && editingField === `content-item-${idx}` ? (
                          <Textarea
                            value={item}
                            onChange={(e) => updateContentItem(idx, e.target.value)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            className="bg-white/10 border-white/20 text-white/80 text-lg resize-none flex-1 min-h-[40px]"
                          />
                        ) : (
                          <p 
                            onClick={() => isEditing && setEditingField(`content-item-${idx}`)}
                            className={cn(
                              "text-white/80 text-lg lg:text-xl leading-relaxed flex-1",
                              isEditing && 'cursor-text hover:bg-white/5 px-2 py-1 rounded transition-colors'
                            )}
                          >
                            {item}
                          </p>
                        )}
                        {isEditing && slide.content.length > 1 && (
                          <button
                            onClick={() => removeContentItem(idx)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                            title="Remove bullet point"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                    {isEditing && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={addContentItem}
                        className={cn(
                          "flex items-center gap-2 text-sm font-medium mt-4 px-4 py-2 rounded-lg border border-dashed border-white/30 hover:border-white/50 hover:bg-white/5 transition-all",
                          colors.accent
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        Add bullet point
                      </motion.button>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with progress */}
      <footer className="absolute bottom-0 left-0 right-0 px-8 lg:px-16 py-6 z-20">
        <div className="flex items-center justify-center gap-2">
          {presentation.slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className="relative group"
            >
              <motion.div
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  idx === currentSlide
                    ? colors.accent.replace('text-', 'bg-')
                    : idx < currentSlide
                      ? "bg-white/40"
                      : "bg-white/20"
                )}
                whileHover={{ scale: 1.3 }}
              />
              {idx === currentSlide && (
                <motion.div
                  layoutId="activeIndicator"
                  className={cn("absolute inset-0 rounded-full border-2", colors.accent.replace('text-', 'border-'))}
                  style={{ margin: '-4px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
        <p className="text-center text-white/30 text-sm mt-3">
          {currentSlide + 1} of {totalSlides}
        </p>
      </footer>

      {/* Slide Image Generator Dialog */}
      <SlideImageGenerator
        open={showImageGenerator}
        onOpenChange={setShowImageGenerator}
        onImageGenerated={handleImageGenerated}
        currentImage={slide?.customImage || null}
        slideTitle={slide?.title || ''}
        topic={presentation?.topic || ''}
      />
    </div>
  );
}
