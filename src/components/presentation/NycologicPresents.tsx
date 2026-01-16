import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, Check, Play, X, Sparkles, BookOpen, Lightbulb, HelpCircle, Award, Home, Maximize2, Minimize2, Volume2, VolumeX, Download, FileText, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { exportToPDF, exportToPPTX } from '@/lib/presentationExport';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';

export interface PresentationSlide {
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
}

export interface VisualTheme {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  pattern: string;
}

export interface NycologicPresentation {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  slides: PresentationSlide[];
  createdAt: Date;
  visualTheme?: VisualTheme;
}

interface NycologicPresentsProps {
  presentation: NycologicPresentation;
  onClose: () => void;
  onMinimize?: () => void;
  onSave?: (presentation: NycologicPresentation) => void;
  isEditable?: boolean;
}

const slideIcons = {
  lightbulb: Lightbulb,
  book: BookOpen,
  question: HelpCircle,
  award: Award,
  sparkles: Sparkles,
};

// Default slide type colors (used as fallback)
const defaultSlideTypeColors: Record<PresentationSlide['type'], { bg: string; accent: string }> = {
  title: { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'text-amber-400' },
  content: { bg: 'from-slate-900 via-blue-950 to-slate-900', accent: 'text-sky-400' },
  question: { bg: 'from-slate-900 via-purple-950 to-slate-900', accent: 'text-violet-400' },
  reveal: { bg: 'from-slate-900 via-emerald-950 to-slate-900', accent: 'text-emerald-400' },
  summary: { bg: 'from-slate-900 via-amber-950 to-slate-900', accent: 'text-amber-400' },
  interactive: { bg: 'from-slate-900 via-rose-950 to-slate-900', accent: 'text-rose-400' },
};

// Theme accent color mapping
const themeAccentColors: Record<string, string> = {
  'neon-city': 'text-pink-400',
  'ocean-wave': 'text-cyan-400',
  'sunset-glow': 'text-amber-400',
  'forest-zen': 'text-emerald-400',
  'galaxy-dreams': 'text-violet-400',
  'candy-pop': 'text-rose-400',
};

export function NycologicPresents({ 
  presentation: initialPresentation, 
  onClose,
  onMinimize,
  onSave,
  isEditable = true 
}: NycologicPresentsProps) {
  const { toast } = useToast();
  const [presentation, setPresentation] = useState(initialPresentation);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const slide = presentation.slides[currentSlide];
  const totalSlides = presentation.slides.length;
  const visualTheme = presentation.visualTheme;
  
  // Use visual theme colors if available, otherwise fall back to default slide type colors
  const colors = visualTheme 
    ? { 
        bg: `bg-gradient-to-br ${visualTheme.gradient}`, 
        accent: themeAccentColors[visualTheme.id] || 'text-amber-400' 
      }
    : defaultSlideTypeColors[slide.type];
  
  const IconComponent = slide.icon ? slideIcons[slide.icon] : null;

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
      if (editingField) return;
      
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
          if (isFullscreen) {
            document.exitFullscreen?.();
          } else {
            onClose();
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, nextSlide, prevSlide, isFullscreen, onClose, editingField]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const updateSlide = (field: string, value: any) => {
    const updatedSlides = [...presentation.slides];
    if (field === 'content') {
      updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], content: value };
    } else if (field === 'title') {
      updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], title: value };
    } else if (field === 'subtitle') {
      updatedSlides[currentSlide] = { ...updatedSlides[currentSlide], subtitle: value };
    } else if (field.startsWith('question.')) {
      const questionField = field.split('.')[1];
      updatedSlides[currentSlide] = { 
        ...updatedSlides[currentSlide], 
        question: { ...updatedSlides[currentSlide].question!, [questionField]: value }
      };
    }
    setPresentation({ ...presentation, slides: updatedSlides });
  };

  const handleSave = () => {
    onSave?.(presentation);
    setIsEditing(false);
    setEditingField(null);
  };

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    // Auto-show answer after selection
    setTimeout(() => setShowAnswer(true), 500);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(presentation);
      toast({
        title: 'PDF exported!',
        description: 'Your presentation has been downloaded as a PDF.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      await exportToPPTX(presentation);
      toast({
        title: 'PowerPoint exported!',
        description: 'Your presentation has been downloaded as a PPTX file.',
      });
    } catch (error) {
      console.error('PPTX export error:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export PowerPoint. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999] w-screen h-screen",
        visualTheme ? `bg-gradient-to-br ${visualTheme.gradient}` : `bg-gradient-to-br ${colors.bg}`
      )}
      style={{ 
        ...(visualTheme ? { backgroundImage: visualTheme.pattern } : {}),
        minHeight: '100vh',
        minWidth: '100vw',
      }}
    >
      {/* Animated background particles - larger and more visible */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
            }}
            initial={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`,
              opacity: 0 
            }}
            animate={{ 
              y: [`${Math.random() * 100}%`, `${Math.random() * 100 - 20}%`],
              opacity: [0, 0.6, 0],
            }}
            transition={{ 
              duration: 4 + Math.random() * 3, 
              repeat: Infinity,
              delay: Math.random() * 3 
            }}
          />
        ))}
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Header - more prominent */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 md:px-12 py-6 z-20"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
              title="Close presentation"
            >
              <X className="h-6 w-6" />
            </Button>
            {onMinimize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSave?.(presentation);
                  onMinimize();
                }}
                className="text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
                title="Minimize to builder"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <img src={nyclogicLogo} alt="NYClogic" className="h-12 w-12 drop-shadow-lg" />
            <div>
              <p className={cn("text-sm font-bold tracking-[0.2em] uppercase drop-shadow-md", colors.accent)}>
                NYClogic PRESENTS
              </p>
              <h1 className="text-white font-serif text-xl md:text-2xl drop-shadow-lg">{presentation.title}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                className="text-white/80 hover:text-white hover:bg-white/20 h-10 px-4"
              >
                <Download className="h-5 w-5 mr-2" />
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPPTX} className="cursor-pointer">
                <Presentation className="h-4 w-4 mr-2" />
                Export as PowerPoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="text-white/80 hover:text-white hover:bg-white/20 h-10 px-4"
            >
              {isEditing ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit3 className="h-5 w-5 mr-2" />
                  Edit
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white hover:bg-white/20 h-12 w-12"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>
      </motion.header>

      {/* Navigation arrows - larger and more visible */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={cn(
          "absolute left-6 md:left-12 top-1/2 -translate-y-1/2 z-20",
          "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center",
          "transition-all duration-300 backdrop-blur-sm",
          currentSlide === 0 
            ? "opacity-20 cursor-not-allowed" 
            : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white hover:scale-110 shadow-2xl"
        )}
      >
        <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" />
      </button>

      <button
        onClick={nextSlide}
        disabled={currentSlide === totalSlides - 1}
        className={cn(
          "absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-20",
          "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center",
          "transition-all duration-300 backdrop-blur-sm",
          currentSlide === totalSlides - 1 
            ? "opacity-20 cursor-not-allowed" 
            : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white hover:scale-110 shadow-2xl"
        )}
      >
        <ChevronRight className="h-8 w-8 md:h-10 md:w-10" />
      </button>

      {/* Main content - truly fullscreen */}
      <main className="absolute inset-0 flex items-center justify-center px-24 md:px-32 lg:px-40 py-28 md:py-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-full flex flex-col items-center justify-center text-center"
          >
            {/* Icon - larger */}
            {IconComponent && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className={cn(
                  "mx-auto mb-8 w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center",
                  "bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md shadow-2xl"
                )}
              >
                <IconComponent className={cn("h-12 w-12 md:h-14 md:w-14", colors.accent)} />
              </motion.div>
            )}

            {/* Subtitle/Topic tag - larger */}
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn("text-base md:text-lg font-bold tracking-[0.25em] uppercase mb-6 drop-shadow-lg", colors.accent)}
              >
                {isEditing && editingField === 'subtitle' ? (
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide('subtitle', e.target.value)}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    className="bg-white/10 border-white/20 text-white text-center max-w-lg mx-auto text-lg"
                  />
                ) : (
                  <span 
                    onClick={() => isEditing && setEditingField('subtitle')}
                    className={isEditing ? 'cursor-text hover:underline' : ''}
                  >
                    {slide.subtitle}
                  </span>
                )}
              </motion.p>
            )}

            {/* Title - much larger */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white mb-10 leading-tight drop-shadow-2xl"
            >
              {isEditing && editingField === 'title' ? (
                <Textarea
                  value={slide.title}
                  onChange={(e) => updateSlide('title', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  className="bg-white/10 border-white/20 text-white text-center text-5xl font-serif resize-none"
                  rows={2}
                />
              ) : (
                <span 
                  onClick={() => isEditing && setEditingField('title')}
                  className={isEditing ? 'cursor-text hover:underline' : ''}
                  dangerouslySetInnerHTML={{ 
                    __html: slide.title.replace(
                      /\*\*(.*?)\*\*/g, 
                      `<span class="${colors.accent}">$1</span>`
                    )
                  }}
                />
              )}
            </motion.h2>

            {/* Content - larger text */}
            {slide.content.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/80 text-xl md:text-2xl lg:text-3xl leading-relaxed max-w-5xl mx-auto space-y-6"
              >
                {slide.content.map((item, index) => (
                  <p key={index} className="drop-shadow-md">
                    {isEditing && editingField === `content-${index}` ? (
                      <Textarea
                        value={item}
                        onChange={(e) => {
                          const newContent = [...slide.content];
                          newContent[index] = e.target.value;
                          updateSlide('content', newContent);
                        }}
                        onBlur={() => setEditingField(null)}
                        autoFocus
                        className="bg-white/10 border-white/20 text-white text-center resize-none text-xl"
                        rows={3}
                      />
                    ) : (
                      <span 
                        onClick={() => isEditing && setEditingField(`content-${index}`)}
                        className={isEditing ? 'cursor-text hover:underline' : ''}
                      >
                        {item}
                      </span>
                    )}
                  </p>
                ))}
              </motion.div>
            )}

            {/* Question section - larger */}
            {slide.type === 'question' && slide.question && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 space-y-8 w-full max-w-4xl mx-auto"
              >
                <p className="text-2xl md:text-3xl text-white font-medium drop-shadow-lg">{slide.question.prompt}</p>
                
                {slide.question.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {slide.question.options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOptionSelect(index)}
                        className={cn(
                          "p-6 rounded-2xl text-left transition-all duration-300",
                          "border-2 border-white/20 backdrop-blur-sm",
                          selectedOption === index
                            ? showAnswer && slide.question?.answer === option
                              ? "bg-emerald-500/40 border-emerald-400 shadow-lg shadow-emerald-500/20"
                              : showAnswer
                              ? "bg-red-500/40 border-red-400 shadow-lg shadow-red-500/20"
                              : "bg-white/25 border-white/50"
                            : "bg-white/10 hover:bg-white/15"
                        )}
                      >
                        <span className={cn("font-bold mr-3 text-xl", colors.accent)}>
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className="text-white text-lg md:text-xl">{option}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {!slide.question.options && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="border-2 border-white/30 text-white hover:bg-white/15 text-lg px-8 py-6 h-auto"
                  >
                    {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
                  </Button>
                )}

                <AnimatePresence>
                  {showAnswer && slide.question.answer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                        <p className={cn("font-bold mb-3 text-xl", colors.accent)}>Answer:</p>
                        <p className="text-white text-xl md:text-2xl">{slide.question.answer}</p>
                        {slide.question.explanation && (
                          <>
                            <p className={cn("font-bold mt-6 mb-3 text-xl", colors.accent)}>Explanation:</p>
                            <p className="text-white/90 text-lg md:text-xl">{slide.question.explanation}</p>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with progress - larger */}
      <motion.footer 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 px-8 py-8 z-20"
      >
        <div className="flex items-center justify-center gap-6">
          {/* Slide dots - larger */}
          <div className="flex items-center gap-3">
            {presentation.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "transition-all duration-300 rounded-full",
                  index === currentSlide 
                    ? "w-12 h-3 bg-white shadow-lg" 
                    : "w-3 h-3 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
          
          {/* Slide counter - larger */}
          <p className="text-white/60 text-lg font-medium ml-6">
            {currentSlide + 1} / {totalSlides}
          </p>
        </div>

        {/* Navigation hint */}
        <p className="text-center text-white/40 text-sm mt-4">
          Press ← → arrow keys or click to navigate • Press F for fullscreen
        </p>
      </motion.footer>
    </div>
  );
}
