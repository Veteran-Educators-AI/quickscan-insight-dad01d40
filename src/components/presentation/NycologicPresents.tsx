import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, Check, Play, X, Sparkles, BookOpen, Lightbulb, HelpCircle, Award, Home, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

export interface NycologicPresentation {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  slides: PresentationSlide[];
  createdAt: Date;
}

interface NycologicPresentsProps {
  presentation: NycologicPresentation;
  onClose: () => void;
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

const slideTypeColors: Record<PresentationSlide['type'], { bg: string; accent: string }> = {
  title: { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'text-amber-400' },
  content: { bg: 'from-slate-900 via-blue-950 to-slate-900', accent: 'text-sky-400' },
  question: { bg: 'from-slate-900 via-purple-950 to-slate-900', accent: 'text-violet-400' },
  reveal: { bg: 'from-slate-900 via-emerald-950 to-slate-900', accent: 'text-emerald-400' },
  summary: { bg: 'from-slate-900 via-amber-950 to-slate-900', accent: 'text-amber-400' },
  interactive: { bg: 'from-slate-900 via-rose-950 to-slate-900', accent: 'text-rose-400' },
};

export function NycologicPresents({ 
  presentation: initialPresentation, 
  onClose, 
  onSave,
  isEditable = true 
}: NycologicPresentsProps) {
  const [presentation, setPresentation] = useState(initialPresentation);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const slide = presentation.slides[currentSlide];
  const totalSlides = presentation.slides.length;
  const colors = slideTypeColors[slide.type];
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

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-gradient-to-br",
      colors.bg
    )}>
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/10"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              opacity: 0 
            }}
            animate={{ 
              y: [null, Math.random() * -100],
              opacity: [0, 0.5, 0],
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2 
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-4 z-10"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <p className={cn("text-xs font-medium tracking-widest uppercase", colors.accent)}>
              NYClogic PRESENTS:
            </p>
            <h1 className="text-white/90 font-serif text-lg">{presentation.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </motion.header>

      {/* Navigation arrows */}
      <button
        onClick={prevSlide}
        disabled={currentSlide === 0}
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-10",
          "w-12 h-12 rounded-full flex items-center justify-center",
          "transition-all duration-300",
          currentSlide === 0 
            ? "opacity-20 cursor-not-allowed" 
            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white hover:scale-110"
        )}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        disabled={currentSlide === totalSlides - 1}
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 z-10",
          "w-12 h-12 rounded-full flex items-center justify-center",
          "transition-all duration-300",
          currentSlide === totalSlides - 1 
            ? "opacity-20 cursor-not-allowed" 
            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white hover:scale-110"
        )}
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Main content */}
      <main className="absolute inset-0 flex items-center justify-center px-20 py-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-5xl text-center"
          >
            {/* Icon */}
            {IconComponent && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className={cn(
                  "mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
                )}
              >
                <IconComponent className={cn("h-8 w-8", colors.accent)} />
              </motion.div>
            )}

            {/* Subtitle/Topic tag */}
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn("text-sm font-medium tracking-widest uppercase mb-4", colors.accent)}
              >
                {isEditing && editingField === 'subtitle' ? (
                  <Input
                    value={slide.subtitle}
                    onChange={(e) => updateSlide('subtitle', e.target.value)}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    className="bg-white/10 border-white/20 text-white text-center max-w-md mx-auto"
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

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-8 leading-tight"
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
                      `<span class="${colors.accent}">$1</span>`
                    )
                  }}
                />
              )}
            </motion.h2>

            {/* Content */}
            {slide.content.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/70 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto space-y-4"
              >
                {slide.content.map((item, index) => (
                  <p key={index}>
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
                        className="bg-white/10 border-white/20 text-white text-center resize-none"
                        rows={2}
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

            {/* Question section */}
            {slide.type === 'question' && slide.question && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-10 space-y-6"
              >
                <p className="text-xl text-white/90 font-medium">{slide.question.prompt}</p>
                
                {slide.question.options && (
                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {slide.question.options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOptionSelect(index)}
                        className={cn(
                          "p-4 rounded-xl text-left transition-all duration-300",
                          "border border-white/20",
                          selectedOption === index
                            ? showAnswer && slide.question?.answer === option
                              ? "bg-emerald-500/30 border-emerald-400"
                              : showAnswer
                              ? "bg-red-500/30 border-red-400"
                              : "bg-white/20 border-white/40"
                            : "bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <span className={cn("font-medium mr-2", colors.accent)}>
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <span className="text-white/90">{option}</span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {!slide.question.options && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="border-white/20 text-white hover:bg-white/10"
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
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <p className={cn("font-semibold mb-2", colors.accent)}>Answer:</p>
                        <p className="text-white text-lg">{slide.question.answer}</p>
                        {slide.question.explanation && (
                          <>
                            <p className={cn("font-semibold mt-4 mb-2", colors.accent)}>Explanation:</p>
                            <p className="text-white/80">{slide.question.explanation}</p>
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

      {/* Footer with progress */}
      <motion.footer 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 px-8 py-6 z-10"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Slide dots */}
          <div className="flex items-center gap-2">
            {presentation.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "transition-all duration-300 rounded-full",
                  index === currentSlide 
                    ? "w-8 h-2 bg-white" 
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
          
          {/* Slide counter */}
          <p className="text-white/50 text-sm ml-4">
            {currentSlide + 1} / {totalSlides}
          </p>
        </div>

        {/* Navigation hint */}
        <p className="text-center text-white/30 text-xs mt-3">
          Press arrow keys or click to navigate
        </p>
      </motion.footer>
    </div>
  );
}
