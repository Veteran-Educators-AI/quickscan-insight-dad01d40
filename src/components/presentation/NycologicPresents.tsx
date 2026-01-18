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

export interface SlideImage {
  url: string;
  prompt: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
}

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
  image?: SlideImage;
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

// Default presentation colors - deep navy with gold accents (like reference site)
const defaultSlideTypeColors: Record<PresentationSlide['type'], { bg: string; accent: string; bgStyle: string }> = {
  title: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', bgStyle: '#0f172a' },
  content: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', bgStyle: '#0f172a' },
  question: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', bgStyle: '#0f172a' },
  reveal: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-emerald-400', bgStyle: '#0f172a' },
  summary: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', bgStyle: '#0f172a' },
  interactive: { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-rose-400', bgStyle: '#0f172a' },
};

// Theme CSS color values for proper inline style application
const themeBackgroundColors: Record<string, { start: string; mid: string; end: string }> = {
  'neon-city': { start: '#581c87', mid: '#9333ea', end: '#c2410c' },
  'ocean-wave': { start: '#164e63', mid: '#0369a1', end: '#1e3a8a' },
  'sunset-glow': { start: '#7c2d12', mid: '#ea580c', end: '#9f1239' },
  'forest-zen': { start: '#064e3b', mid: '#0d9488', end: '#0891b2' },
  'galaxy-dreams': { start: '#4c1d95', mid: '#7c3aed', end: '#a21caf' },
  'candy-pop': { start: '#831843', mid: '#ec4899', end: '#f43f5e' },
};

// Theme accent color mapping - updated for premium look
const themeAccentColors: Record<string, string> = {
  'neon-city': 'text-pink-400',
  'ocean-wave': 'text-cyan-400',
  'sunset-glow': 'text-amber-400',
  'forest-zen': 'text-emerald-400',
  'galaxy-dreams': 'text-violet-400',
  'candy-pop': 'text-rose-400',
};

// Theme accent hex colors for inline styles
const themeAccentHexColors: Record<string, string> = {
  'neon-city': '#f472b6',
  'ocean-wave': '#22d3ee',
  'sunset-glow': '#fbbf24',
  'forest-zen': '#34d399',
  'galaxy-dreams': '#a78bfa',
  'candy-pop': '#fb7185',
};

// Theme glow colors for particles and effects
const themeGlowColors: Record<string, string> = {
  'neon-city': 'rgba(236, 72, 153, 0.4)',
  'ocean-wave': 'rgba(34, 211, 238, 0.4)',
  'sunset-glow': 'rgba(251, 191, 36, 0.4)',
  'forest-zen': 'rgba(16, 185, 129, 0.4)',
  'galaxy-dreams': 'rgba(139, 92, 246, 0.4)',
  'candy-pop': 'rgba(244, 114, 182, 0.4)',
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
        accent: themeAccentColors[visualTheme.id] || 'text-amber-400',
        accentHex: themeAccentHexColors[visualTheme.id] || '#fbbf24'
      }
    : { ...defaultSlideTypeColors[slide.type], accentHex: '#fbbf24' };
  
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
      // Don't intercept keyboard events when user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (editingField || isTyping) return;
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextSlide();
          break;
        case ' ':
          // Only use spacebar for navigation if not in any text input context
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

  // Get theme-specific colors
  const themeBgColors = visualTheme?.id ? themeBackgroundColors[visualTheme.id] : null;
  const themeGlow = visualTheme?.id ? themeGlowColors[visualTheme.id] : 'rgba(251, 191, 36, 0.4)';
  
  return (
    <div 
      className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden"
      style={{ 
        background: themeBgColors 
          ? `linear-gradient(135deg, ${themeBgColors.start} 0%, ${themeBgColors.mid} 50%, ${themeBgColors.end} 100%)`
          : 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0a1628 100%)',
        minHeight: '100vh',
        minWidth: '100vw',
      }}
    >
      {/* Subtle radial glow effect - uses theme color */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${themeGlow.replace('0.4', '0.15')} 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, ${themeGlow.replace('0.4', '0.1')} 0%, transparent 50%)`,
        }}
      />

      {/* Minimal floating particles - uses theme color */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              backgroundColor: themeGlow.replace('0.4', '0.3'),
            }}
            initial={{ 
              x: `${Math.random() * 100}%`, 
              y: `${Math.random() * 100}%`,
              opacity: 0 
            }}
            animate={{ 
              y: [`${Math.random() * 100}%`, `${Math.random() * 100 - 30}%`],
              opacity: [0, 0.4, 0],
            }}
            transition={{ 
              duration: 6 + Math.random() * 4, 
              repeat: Infinity,
              delay: Math.random() * 4 
            }}
          />
        ))}
      </div>

      {/* Subtle corner accents - uses theme color */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-1/3 -left-1/4 w-1/2 h-1/2 rounded-full blur-[120px]" 
          style={{ backgroundColor: themeGlow.replace('0.4', '0.08') }}
        />
        <div 
          className="absolute -bottom-1/3 -right-1/4 w-1/2 h-1/2 rounded-full blur-[120px]" 
          style={{ backgroundColor: themeGlow.replace('0.4', '0.08') }}
        />
      </div>

      {/* Header - clean and minimal */}
      <motion.header 
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 md:px-16 py-6 z-20"
      >
        <div className="flex items-center gap-6">
          {/* Logo and brand */}
          <div className="flex items-center gap-4">
            <img 
              src={nyclogicLogo} 
              alt="NYClogic" 
              className="h-14 w-14 md:h-16 md:w-16 drop-shadow-2xl"
            />
            <div className="hidden sm:block">
              <p 
                className="text-xs md:text-sm font-bold tracking-[0.3em] uppercase"
                style={{ color: colors.accentHex }}
              >
                NYClogic PRESENTS
              </p>
            </div>
          </div>
          
          {/* Control buttons */}
          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
              title="Close presentation"
            >
              <X className="h-5 w-5" />
            </Button>
            {onMinimize && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSave?.(presentation);
                  onMinimize();
                }}
                className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
                title="Minimize to builder"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isExporting}
                className="text-white/60 hover:text-white hover:bg-white/10 h-10 px-3 rounded-full"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
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
              className="text-white/60 hover:text-white hover:bg-white/10 h-10 px-3 rounded-full"
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Save</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Edit</span>
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </motion.header>

      {/* Navigation arrows - elegant circular design */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={cn(
          "absolute left-8 md:left-16 top-1/2 -translate-y-1/2 z-20",
          "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center",
          "transition-all duration-300 border-2",
          currentSlide === 0 
            ? "opacity-20 cursor-not-allowed border-white/20" 
            : "border-white/30 hover:border-amber-400/60 text-white/70 hover:text-amber-400 hover:scale-105"
        )}
      >
        <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      <button
        onClick={nextSlide}
        disabled={currentSlide === totalSlides - 1}
        className={cn(
          "absolute right-8 md:right-16 top-1/2 -translate-y-1/2 z-20",
          "w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center",
          "transition-all duration-300 border-2",
          currentSlide === totalSlides - 1 
            ? "opacity-20 cursor-not-allowed border-white/20" 
            : "border-white/30 hover:border-amber-400/60 text-white/70 hover:text-amber-400 hover:scale-105"
        )}
      >
        <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
      </button>

      {/* Main content - centered fullscreen */}
      <main className="absolute inset-0 flex items-center justify-center px-28 md:px-36 lg:px-48 py-24 md:py-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full flex flex-col items-center justify-center text-center"
          >
            {/* Icon - subtle */}
            {IconComponent && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mx-auto mb-6"
              >
                <IconComponent 
                  className="h-10 w-10 md:h-12 md:w-12" 
                  style={{ color: colors.accentHex, opacity: 0.8 }}
                />
              </motion.div>
            )}

            {/* Subtitle tag */}
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base font-semibold tracking-[0.25em] uppercase mb-4"
                style={{ color: colors.accentHex }}
              >
                {isEditing && editingField === 'subtitle' ? (
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide('subtitle', e.target.value)}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    className="bg-white/10 border-white/20 text-white text-center max-w-lg mx-auto"
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

            {/* Title - elegant serif with gold highlights */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white mb-8 leading-tight max-w-5xl"
            >
              {isEditing && editingField === 'title' ? (
                <Textarea
                  value={slide.title}
                  onChange={(e) => updateSlide('title', e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  className="bg-white/10 border-white/20 text-white text-center text-4xl font-serif resize-none"
                  rows={2}
                />
              ) : (
                <span 
                  onClick={() => isEditing && setEditingField('title')}
                  className={isEditing ? 'cursor-text hover:underline' : ''}
                  dangerouslySetInnerHTML={{ 
                    __html: slide.title.replace(
                      /\*\*(.*?)\*\*/g, 
                      `<span style="color: ${colors.accentHex}">$1</span>`
                    )
                  }}
                />
              )}
            </motion.h2>

            {/* Content - premium styled text */}
            {slide.content.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-xl md:text-2xl lg:text-3xl leading-relaxed max-w-5xl mx-auto space-y-8"
              >
                {slide.content.map((item, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="relative pl-8 border-l-2"
                    style={{ borderColor: `${colors.accentHex}66` }}
                  >
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
                        className="bg-white/10 border-white/20 text-white resize-none text-xl"
                        rows={3}
                      />
                    ) : (
                      <p 
                        onClick={() => isEditing && setEditingField(`content-${index}`)}
                        className={cn(
                          "text-white/85 leading-relaxed",
                          isEditing ? 'cursor-text hover:text-white' : ''
                        )}
                      >
                        {item}
                      </p>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Question section - premium styling */}
            {slide.type === 'question' && slide.question && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-12 space-y-10 w-full max-w-4xl mx-auto"
              >
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                  <p className="text-2xl md:text-3xl text-white font-medium leading-relaxed">{slide.question.prompt}</p>
                </div>
                
                {slide.question.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slide.question.options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOptionSelect(index)}
                        className={cn(
                          "p-5 rounded-xl text-left transition-all duration-300 relative overflow-hidden",
                          "border border-white/10",
                          selectedOption === index
                            ? showAnswer && slide.question?.answer === option
                              ? "bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 border-emerald-400/60 shadow-lg shadow-emerald-500/20"
                              : showAnswer
                              ? "bg-gradient-to-r from-red-500/30 to-red-600/20 border-red-400/60 shadow-lg shadow-red-500/20"
                              : "bg-amber-400/20 border-amber-400/50"
                            : "bg-white/5 hover:bg-white/10 hover:border-white/20"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <span className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0",
                            selectedOption === index 
                              ? "bg-amber-400 text-slate-900" 
                              : "bg-white/10 text-white/70"
                          )}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-white text-lg md:text-xl leading-relaxed pt-1.5">{option}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {!slide.question.options && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="border border-amber-400/50 text-amber-400 hover:bg-amber-400/10 text-lg px-10 py-6 h-auto rounded-xl"
                  >
                    {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
                  </Button>
                )}

                <AnimatePresence>
                  {showAnswer && slide.question.answer && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-gradient-to-br from-amber-400/10 to-amber-600/5 backdrop-blur-md rounded-2xl p-8 border border-amber-400/30 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                            <span className="text-slate-900 font-bold text-sm">✓</span>
                          </div>
                          <p className="text-amber-400 font-semibold text-xl">Answer</p>
                        </div>
                        <p className="text-white text-xl md:text-2xl leading-relaxed">{slide.question.answer}</p>
                        {slide.question.explanation && (
                          <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-amber-400/80 font-medium mb-3 text-lg">Explanation</p>
                            <p className="text-white/80 text-lg md:text-xl leading-relaxed">{slide.question.explanation}</p>
                          </div>
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

      {/* Footer with premium dot-based progress */}
      <motion.footer 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 px-8 py-10 z-20"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Premium dot indicators */}
          <div className="flex items-center gap-2.5">
            {presentation.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className="group relative p-1"
              >
                <motion.div
                  animate={{
                    scale: index === currentSlide ? 1 : 0.7,
                    opacity: index === currentSlide ? 1 : 0.4,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                  style={index === currentSlide ? { 
                    backgroundColor: colors.accentHex, 
                    boxShadow: `0 10px 15px -3px ${colors.accentHex}80`
                  } : { 
                    backgroundColor: 'rgba(255,255,255,0.6)' 
                  }}
                />
                {/* Active indicator ring */}
                {index === currentSlide && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div 
                      className="w-5 h-5 rounded-full border-2 animate-pulse" 
                      style={{ borderColor: `${colors.accentHex}80` }}
                    />
                  </motion.div>
                )}
              </button>
            ))}
          </div>
          
          {/* Slide counter with subtle styling */}
          <p className="text-white/40 text-sm font-light tracking-wider">
            <span className="font-medium" style={{ color: `${colors.accentHex}cc` }}>{currentSlide + 1}</span>
            <span className="mx-2">of</span>
            <span>{totalSlides}</span>
          </p>
        </div>

        {/* Navigation hint - more subtle */}
        <p className="text-center text-white/25 text-xs mt-4 tracking-wide">
          ← → to navigate • F for fullscreen • ESC to exit
        </p>
      </motion.footer>
    </div>
  );
}
