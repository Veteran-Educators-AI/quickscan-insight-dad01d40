import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, Sparkles, BookOpen, Lightbulb, HelpCircle, Award, Home, LayoutGrid, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';

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
  const [presentation, setPresentation] = useState<NycologicPresentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

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
                <motion.button
                  key={s.id}
                  onClick={() => {
                    goToSlide(idx);
                    setShowSidebar(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                      "aspect-video w-full p-3 flex items-center justify-center",
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
              <div className="text-center space-y-8">
                {/* AI Generated image */}
                {slideImages[currentSlide] && (
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
                {isGeneratingImages && !slideImages[currentSlide] && (
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
                  {slide.title}
                </motion.h1>

                {slide.subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className={cn("text-xl lg:text-2xl font-medium tracking-wide", colors.accent)}
                  >
                    {slide.subtitle}
                  </motion.p>
                )}

                {slide.content.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-white/60 text-lg lg:text-xl max-w-3xl mx-auto"
                  >
                    {slide.content[0]}
                  </motion.p>
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
                    {slide.title}
                  </motion.h2>

                  {slide.question && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/10 mt-8"
                    >
                      <p className="text-xl lg:text-2xl text-white/90">
                        {slide.question.prompt}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Options */}
                {slide.question?.options && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto"
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
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "relative p-5 lg:p-6 rounded-xl text-left transition-all duration-300",
                            "border-2 backdrop-blur-sm",
                            isCorrect 
                              ? "border-emerald-400 bg-emerald-500/20" 
                              : isWrong
                                ? "border-red-400 bg-red-500/20"
                                : isSelected
                                  ? "border-white/40 bg-white/10"
                                  : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          )}
                        >
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold mr-4",
                            isCorrect ? "bg-emerald-400 text-white" :
                            isWrong ? "bg-red-400 text-white" :
                            isSelected ? "bg-white/20 text-white" :
                            "bg-white/10 text-white/60"
                          )}>
                            {letters[idx]}
                          </span>
                          <span className="text-white text-lg lg:text-xl">{option}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Answer reveal */}
                {showAnswer && slide.question?.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-400/30"
                  >
                    <h4 className="text-emerald-400 font-bold text-lg mb-3">Explanation</h4>
                    <p className="text-white/80 text-lg">{slide.question.explanation}</p>
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
                  {slide.subtitle && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn("text-sm font-bold tracking-[0.25em] uppercase", colors.accent)}
                    >
                      {slide.subtitle}
                    </motion.p>
                  )}

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                  >
                    {slide.title}
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
                        className="flex items-start gap-4"
                      >
                        <span className={cn("w-2 h-2 rounded-full mt-3 flex-shrink-0", colors.accent.replace('text-', 'bg-'))} />
                        <p className="text-white/80 text-lg lg:text-xl leading-relaxed">{item}</p>
                      </motion.div>
                    ))}
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
    </div>
  );
}
