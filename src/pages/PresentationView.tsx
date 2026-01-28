import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, Sparkles, BookOpen, Lightbulb, HelpCircle, Award, Home, LayoutGrid, PanelLeftClose, Pencil, Save, Check, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Cloud, CloudOff, Library, ImagePlus, Radio, Users, Wand2, Send, Type, Minus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';
import { SlideImageGenerator, GeneratedImageData } from '@/components/presentation/SlideImageGenerator';
import { LiveSessionControls } from '@/components/presentation/LiveSessionControls';

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
  bgHex?: string;  // CSS background gradient string
  accentHex?: string;  // Hex color for accent elements
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

// Theme color schemes with hex values for inline styling
const themeColors: Record<string, { bg: string; accent: string; glow: string; bgHex: string; accentHex: string }> = {
  'neon-city': { bg: 'from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e]', accent: 'text-fuchsia-400', glow: 'rgba(217, 70, 239, 0.15)', bgHex: 'linear-gradient(135deg, #9333ea 0%, #ec4899 50%, #f97316 100%)', accentHex: '#ec4899' },
  'ocean-wave': { bg: 'from-[#0a1628] via-[#0f2847] to-[#0a1628]', accent: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.15)', bgHex: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #4f46e5 100%)', accentHex: '#22d3ee' },
  'sunset-glow': { bg: 'from-[#1a0a0a] via-[#2d1b1b] to-[#1a0a0a]', accent: 'text-amber-400', glow: 'rgba(251, 191, 36, 0.15)', bgHex: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #f43f5e 100%)', accentHex: '#fbbf24' },
  'forest-zen': { bg: 'from-[#0a1a0a] via-[#1b2d1b] to-[#0a1a0a]', accent: 'text-emerald-400', glow: 'rgba(52, 211, 153, 0.15)', bgHex: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0891b2 100%)', accentHex: '#34d399' },
  'galaxy-dreams': { bg: 'from-[#0f0a1a] via-[#1a0f2e] to-[#0f0a1a]', accent: 'text-violet-400', glow: 'rgba(167, 139, 250, 0.15)', bgHex: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #d946ef 100%)', accentHex: '#a78bfa' },
  'candy-pop': { bg: 'from-[#1a0a14] via-[#2d1b24] to-[#1a0a14]', accent: 'text-rose-400', glow: 'rgba(251, 113, 133, 0.15)', bgHex: 'linear-gradient(135deg, #f472b6 0%, #fb7185 50%, #f87171 100%)', accentHex: '#fda4af' },
};

const defaultColors = { bg: 'from-[#0a1628] via-[#0f1f3a] to-[#0a1628]', accent: 'text-amber-400', glow: 'rgba(251, 191, 36, 0.15)', bgHex: 'linear-gradient(135deg, #0a1628 0%, #0f1f3a 50%, #0a1628 100%)', accentHex: '#fbbf24' };

// Helper to strip markdown bold markers (**) from text
const stripAsterisks = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/\*\*/g, '');
};

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
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  
  // Image enhancement states
  const [showEnhancePanel, setShowEnhancePanel] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [customEnhancement, setCustomEnhancement] = useState('');
  
  // Touch gesture states
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const slideContainerRef = useRef<HTMLDivElement>(null);
  
  // Image drag/resize/rotate states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [isRotatingImage, setIsRotatingImage] = useState(false);
  
  // Font size control state (percentage scale: 80 = 80%, 100 = default, 150 = 150%)
  const [fontScale, setFontScale] = useState(100);
  const [showFontControls, setShowFontControls] = useState(false);
  const [imageResizeCorner, setImageResizeCorner] = useState<string | null>(null);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [rotationStartValue, setRotationStartValue] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Load presentation from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('nycologic_presentation');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPresentation(data);
        setIsLoading(false);
        // No auto-generated images - let presenters add images on the fly using the image generator
      } catch (e) {
        console.error('Failed to parse presentation:', e);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Fetch teacher's classes for live session
  useEffect(() => {
    if (!user) return;
    const fetchClasses = async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);
      if (data) {
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
      }
    };
    fetchClasses();
  }, [user]);

  // Presenters can generate images on-the-fly using the image generator dialog
  // No automatic image generation - slides are content-focused by default

  const slide = presentation?.slides[currentSlide];
  const totalSlides = presentation?.slides.length || 0;
  const themeId = presentation?.visualTheme?.id || 'sunset-glow';
  const baseColors = themeColors[themeId] || defaultColors;
  
  // Prioritize embedded hex values from presentation theme if available
  const colors = {
    ...baseColors,
    bgHex: presentation?.visualTheme?.bgHex || baseColors.bgHex,
    accentHex: presentation?.visualTheme?.accentHex || baseColors.accentHex,
  };
  const IconComponent = slide?.icon ? slideIcons[slide.icon] : null;

  // Enhancement suggestions based on topic
  const getEnhancementSuggestions = useCallback(() => {
    const topic = presentation?.topic?.toLowerCase() || '';
    const slideTitle = slide?.title?.toLowerCase() || '';
    
    const baseSuggestions = [
      'Add more detail and depth',
      'Make colors more vibrant',
      'Add subtle lighting effects',
      'Make it more 3D and realistic',
    ];
    
    // Topic-specific suggestions
    if (topic.includes('math') || topic.includes('geometry') || slideTitle.includes('triangle') || slideTitle.includes('equation')) {
      return [
        'Add grid lines in background',
        'Add measurement marks',
        'Add coordinate axes',
        'Add angle indicators',
        ...baseSuggestions.slice(0, 2),
      ];
    }
    if (topic.includes('science') || topic.includes('biology') || topic.includes('chemistry')) {
      return [
        'Add molecular details',
        'Add scientific notation',
        'Add laboratory equipment',
        'Add cellular structures',
        ...baseSuggestions.slice(0, 2),
      ];
    }
    if (topic.includes('history') || topic.includes('social')) {
      return [
        'Add historical texture',
        'Add map elements',
        'Add period-appropriate details',
        'Add vintage styling',
        ...baseSuggestions.slice(0, 2),
      ];
    }
    
    return baseSuggestions;
  }, [presentation?.topic, slide?.title]);

  // Handle image enhancement
  const handleEnhanceImage = async (enhancement: string) => {
    if (!slide?.customImage?.url || !enhancement.trim()) return;
    
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          action: 'enhance',
          imageUrl: slide.customImage.url,
          enhancement: enhancement,
        },
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        // Update the slide with enhanced image
        handleImageGenerated({
          ...slide.customImage,
          url: data.imageUrl,
          prompt: `${slide.customImage.prompt || ''} + ${enhancement}`,
        });
        toast.success('Image enhanced!');
        setShowEnhancePanel(false);
        setCustomEnhancement('');
      } else {
        throw new Error('No enhanced image returned');
      }
    } catch (error) {
      console.error('Error enhancing image:', error);
      toast.error('Failed to enhance image. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

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
      // Don't handle navigation keys when typing in input fields
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement || 
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          // Only navigate if not typing in an input
          if (!isTyping) {
            e.preventDefault();
            nextSlide();
          }
          break;
        case 'ArrowLeft':
          if (!isTyping) {
            e.preventDefault();
            prevSlide();
          }
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else if (showEnhancePanel) {
            setShowEnhancePanel(false);
          } else {
            navigate(-1);
          }
          break;
        case 'f':
          if (!isTyping) {
            toggleFullscreen();
          }
          break;
        case 't':
        case 'T':
          if (!isTyping) {
            setShowSidebar(prev => !prev);
          }
          break;
        case 'e':
        case 'E':
          if (!isTyping && !editingField) {
            toggleEditMode();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, nextSlide, prevSlide, navigate, showEnhancePanel]);

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

  // Touch gesture handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Pinch-to-zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDistance(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / initialPinchDistance;
      setZoomLevel(Math.max(0.5, Math.min(3, scale)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStart.x;
      const deltaY = e.changedTouches[0].clientY - touchStart.y;
      const minSwipeDistance = 50;
      
      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          prevSlide();
        } else {
          nextSlide();
        }
      }
    }
    setTouchStart(null);
    setInitialPinchDistance(null);
  };

  // Reset zoom on slide change
  useEffect(() => {
    setZoomLevel(1);
  }, [currentSlide]);

  // Image drag handlers - always enabled when image exists
  const handleImageDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!slide?.customImage) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingImage || !presentation || !slideContainerRef.current) return;
    
    const rect = slideContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    const updatedSlides = [...presentation.slides];
    if (updatedSlides[currentSlide].customImage) {
      updatedSlides[currentSlide] = {
        ...updatedSlides[currentSlide],
        customImage: {
          ...updatedSlides[currentSlide].customImage!,
          position: { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
        }
      };
      const updatedPresentation = { ...presentation, slides: updatedSlides };
      setPresentation(updatedPresentation);
    }
  };

  const handleImageDragEnd = () => {
    if (isDraggingImage && presentation) {
      sessionStorage.setItem('nycologic_presentation', JSON.stringify(presentation));
    }
    setIsDraggingImage(false);
  };

  // Image resize handlers - always enabled when image exists
  const handleResizeStart = (corner: string) => (e: React.MouseEvent | React.TouchEvent) => {
    if (!slide?.customImage) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizingImage(true);
    setImageResizeCorner(corner);
  };

  const handleResize = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizingImage || !presentation || !slide?.customImage) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const rect = slideContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentImage = slide.customImage;
    let newWidth = currentImage.size.width;
    let newHeight = currentImage.size.height;
    
    // Calculate new dimensions based on mouse position
    const deltaScale = 2; // Sensitivity
    if (imageResizeCorner?.includes('right')) {
      newWidth = Math.max(100, Math.min(800, clientX - rect.left - (rect.width * currentImage.position.x / 100) + currentImage.size.width / 2));
    }
    if (imageResizeCorner?.includes('bottom')) {
      newHeight = Math.max(80, Math.min(600, clientY - rect.top - (rect.height * currentImage.position.y / 100) + currentImage.size.height / 2));
    }
    if (imageResizeCorner?.includes('left')) {
      newWidth = Math.max(100, Math.min(800, (rect.width * currentImage.position.x / 100) - clientX + rect.left + currentImage.size.width / 2));
    }
    if (imageResizeCorner?.includes('top')) {
      newHeight = Math.max(80, Math.min(600, (rect.height * currentImage.position.y / 100) - clientY + rect.top + currentImage.size.height / 2));
    }
    
    const updatedSlides = [...presentation.slides];
    updatedSlides[currentSlide] = {
      ...updatedSlides[currentSlide],
      customImage: {
        ...currentImage,
        size: { width: newWidth, height: newHeight }
      }
    };
    setPresentation({ ...presentation, slides: updatedSlides });
  };

  const handleResizeEnd = () => {
    if (isResizingImage && presentation) {
      sessionStorage.setItem('nycologic_presentation', JSON.stringify(presentation));
    }
    setIsResizingImage(false);
    setImageResizeCorner(null);
  };

  // Image rotation handlers - always enabled when image exists
  const handleRotationStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!slide?.customImage || !slideContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = slideContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + (rect.width * slide.customImage.position.x / 100);
    const centerY = rect.top + (rect.height * slide.customImage.position.y / 100);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    
    setIsRotatingImage(true);
    setRotationStartAngle(angle);
    setRotationStartValue(slide.customImage.rotation);
  };

  const handleRotation = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isRotatingImage || !presentation || !slide?.customImage || !slideContainerRef.current) return;
    
    const rect = slideContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + (rect.width * slide.customImage.position.x / 100);
    const centerY = rect.top + (rect.height * slide.customImage.position.y / 100);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const currentAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const angleDelta = currentAngle - rotationStartAngle;
    let newRotation = rotationStartValue + angleDelta;
    
    // Normalize to -180 to 180
    while (newRotation > 180) newRotation -= 360;
    while (newRotation < -180) newRotation += 360;
    
    // Snap to cardinal angles
    const snapAngles = [0, 90, -90, 180, -180];
    for (const snap of snapAngles) {
      if (Math.abs(newRotation - snap) < 5) {
        newRotation = snap === -180 ? 180 : snap;
        break;
      }
    }
    
    const updatedSlides = [...presentation.slides];
    updatedSlides[currentSlide] = {
      ...updatedSlides[currentSlide],
      customImage: { ...slide.customImage, rotation: Math.round(newRotation) }
    };
    setPresentation({ ...presentation, slides: updatedSlides });
  };

  const handleRotationEnd = () => {
    if (isRotatingImage && presentation) {
      sessionStorage.setItem('nycologic_presentation', JSON.stringify(presentation));
    }
    setIsRotatingImage(false);
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
      className="min-h-screen w-full overflow-hidden relative"
      style={{ minHeight: '100vh', background: colors.bgHex }}
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
          
          {/* Generate Image Button - Always visible for on-the-fly image creation */}
          <Button
            variant="ghost"
            onClick={() => setShowImageGenerator(true)}
            className={cn(
              "h-10 px-4 rounded-full gap-2 transition-all",
              slide?.customImage?.url 
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
            title="Generate image for this slide using AI"
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden md:inline text-sm">
              {slide?.customImage?.url ? 'Edit Image' : 'Add Image'}
            </span>
          </Button>
          
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
          
          {/* Font Size Control */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFontControls(prev => !prev)}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                showFontControls 
                  ? `${colors.accent} bg-white/10` 
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={`Font size: ${fontScale}%`}
            >
              <Type className="h-5 w-5" />
            </Button>
            
            {/* Font Size Popover */}
            {showFontControls && (
              <div className="absolute top-12 right-0 bg-black/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/10 z-50 min-w-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/80 text-sm font-medium">Font Size</span>
                  <span className="text-white/60 text-sm">{fontScale}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFontScale(prev => Math.max(60, prev - 10))}
                    className="h-8 w-8 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Slider
                    value={[fontScale]}
                    onValueChange={(value) => setFontScale(value[0])}
                    min={60}
                    max={150}
                    step={5}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFontScale(prev => Math.min(150, prev + 10))}
                    className="h-8 w-8 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFontScale(100)}
                    className="text-white/50 hover:text-white text-xs h-7 px-3"
                  >
                    Reset to 100%
                  </Button>
                </div>
              </div>
            )}
          </div>
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
                          {stripAsterisks(s.title)}
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

      {/* Main content area with touch gestures */}
      <main 
        ref={slideContainerRef}
        className="min-h-screen flex items-center justify-center px-20 lg:px-40 py-24 lg:py-32 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => {
          handleTouchMove(e);
          if (isDraggingImage) handleImageDrag(e);
          if (isResizingImage) handleResize(e);
          if (isRotatingImage) handleRotation(e);
        }}
        onTouchEnd={(e) => {
          handleTouchEnd(e);
          handleImageDragEnd();
          handleResizeEnd();
          handleRotationEnd();
        }}
        onMouseMove={(e) => {
          if (isDraggingImage) handleImageDrag(e);
          if (isResizingImage) handleResize(e);
          if (isRotatingImage) handleRotation(e);
        }}
        onMouseUp={() => {
          handleImageDragEnd();
          handleResizeEnd();
          handleRotationEnd();
        }}
        onMouseLeave={() => {
          handleImageDragEnd();
          handleResizeEnd();
          handleRotationEnd();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: zoomLevel }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-6xl mx-auto origin-center"
            style={{ fontSize: `${fontScale}%` }}
          >
            {/* Zoom indicator */}
            {zoomLevel !== 1 && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white/80 text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  onClick={() => setZoomLevel(1)} 
                  className="ml-2 text-white/60 hover:text-white text-xs underline"
                >
                  Reset
                </button>
              </div>
            )}
            
            {/* Slide content based on type */}
            {slide.type === 'title' ? (
              <div className="text-center space-y-8 relative">
                {/* Custom Generated Image - always interactive for on-the-fly adjustments */}
                {slide.customImage?.url && (
                  <motion.div
                    ref={imageContainerRef}
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
                    className={cn(
                      "cursor-move group",
                      isDraggingImage && "ring-4 ring-primary/50",
                      isRotatingImage && "ring-4 ring-amber-400/50"
                    )}
                    onMouseDown={handleImageDragStart}
                    onTouchStart={handleImageDragStart}
                  >
                    <img 
                      src={slide.customImage.url} 
                      alt="Slide image"
                      className="w-full h-full object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
                      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }}
                      draggable={false}
                    />
                    
                    {/* Image controls - always visible on hover or when manipulating */}
                    <div className={cn(
                      "transition-opacity",
                      (isDraggingImage || isResizingImage || isRotatingImage) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      {/* Corner resize handles */}
                      <div
                        onMouseDown={handleResizeStart('top-left')}
                        onTouchStart={handleResizeStart('top-left')}
                        className="absolute -top-2 -left-2 w-5 h-5 bg-primary rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg"
                      />
                      <div
                        onMouseDown={handleResizeStart('top-right')}
                        onTouchStart={handleResizeStart('top-right')}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg"
                      />
                      <div
                        onMouseDown={handleResizeStart('bottom-left')}
                        onTouchStart={handleResizeStart('bottom-left')}
                        className="absolute -bottom-2 -left-2 w-5 h-5 bg-primary rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg"
                      />
                      <div
                        onMouseDown={handleResizeStart('bottom-right')}
                        onTouchStart={handleResizeStart('bottom-right')}
                        className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg"
                      />
                      
                      {/* Rotation handle - positioned above the image */}
                      <div className="absolute left-1/2 -translate-x-1/2 -top-12 flex flex-col items-center">
                        {/* Rotation line */}
                        <div className="w-0.5 h-6 bg-amber-400/60" />
                        {/* Rotation handle */}
                        <div
                          onMouseDown={handleRotationStart}
                          onTouchStart={handleRotationStart}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-all hover:scale-110",
                            isRotatingImage ? "bg-amber-500 scale-125" : "bg-amber-400"
                          )}
                          title="Drag to rotate"
                        >
                          <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                            <path d="M21 3v5h-5" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageGenerated({
                            url: '',
                            prompt: '',
                            position: { x: 50, y: 50 },
                            size: { width: 400, height: 300 },
                            rotation: 0,
                          });
                        }}
                        className="absolute -top-2 right-8 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-125 hover:bg-red-600 transition-all shadow-lg"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      
                      {/* Rotation angle display */}
                      {isRotatingImage && (
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                          {slide.customImage?.rotation}°
                        </div>
                      )}
                      
                      {/* Edge label */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white/90 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-2">
                        <span>Drag to move</span>
                        <span className="text-white/40">•</span>
                        <span className="text-primary">Corners to resize</span>
                        <span className="text-white/40">•</span>
                        <span className="text-amber-400">Top to rotate</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Slides are content-focused - images are added on-the-fly by presenter */}

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
                      {stripAsterisks(slide.title)}
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
                        {(() => {
                          const content0 = slide.content[0];
                          if (!content0) return isEditing ? 'Click to add content' : '';
                          if (typeof content0 === 'object' && content0 !== null) {
                            return (content0 as any).text || (content0 as any).heading || '';
                          }
                          return String(content0);
                        })()}
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
                        {stripAsterisks(slide.title)}
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
                          {stripAsterisks(slide.question.prompt)}
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
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative">
                {/* Image placeholder area - fixed location, resizable */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-shrink-0 relative"
                >
                  {(() => {
                    // Get current size from slide or use defaults
                    const placeholderSize = slide.customImage?.size || { width: 288, height: 288 };
                    const minSize = 120;
                    const maxSize = 500;
                    
                    const handlePlaceholderResize = (corner: string) => (e: React.MouseEvent | React.TouchEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
                      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
                      const startWidth = placeholderSize.width;
                      const startHeight = placeholderSize.height;
                      
                      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
                        const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
                        const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
                        
                        let deltaX = clientX - startX;
                        let deltaY = clientY - startY;
                        
                        // Adjust deltas based on corner
                        if (corner.includes('left')) deltaX = -deltaX;
                        if (corner.includes('top')) deltaY = -deltaY;
                        
                        // Use the larger delta to maintain aspect ratio
                        const delta = Math.max(deltaX, deltaY);
                        
                        const newWidth = Math.max(minSize, Math.min(maxSize, startWidth + delta));
                        const newHeight = Math.max(minSize, Math.min(maxSize, startHeight + delta));
                        
                        // Update the slide with new size
                        handleImageGenerated({
                          url: slide.customImage?.url || '',
                          prompt: slide.customImage?.prompt || '',
                          position: slide.customImage?.position || { x: 50, y: 50 },
                          size: { width: newWidth, height: newHeight },
                          rotation: slide.customImage?.rotation || 0,
                        });
                      };
                      
                      const handleEnd = () => {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleEnd);
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                      };
                      
                      document.addEventListener('mousemove', handleMove);
                      document.addEventListener('mouseup', handleEnd);
                      document.addEventListener('touchmove', handleMove, { passive: false });
                      document.addEventListener('touchend', handleEnd);
                    };
                    
                    return (
                      <div 
                        className="relative group"
                        style={{ 
                          width: `${placeholderSize.width}px`, 
                          height: `${placeholderSize.height}px`,
                        }}
                      >
                        {slide.customImage?.url ? (
                          // Generated image - with seamless blending effects
                          <>
                            {/* Soft glow backdrop for seamless integration */}
                            <div 
                              className="absolute inset-0 rounded-2xl blur-3xl opacity-40"
                              style={{ 
                                background: `radial-gradient(circle, ${colors.accentHex}40 0%, transparent 70%)`,
                              }}
                            />
                            <img 
                              src={slide.customImage.url} 
                              alt="Slide image"
                              className="relative w-full h-full object-contain rounded-2xl"
                              style={{ 
                                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
                                mixBlendMode: 'normal',
                              }}
                              draggable={false}
                            />
                            
                            {/* Image controls - visible on hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                              {/* Top buttons row */}
                              <div className="absolute top-2 right-2 flex gap-2">
                                <button
                                  onClick={() => setShowImageGenerator(true)}
                                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 backdrop-blur-sm"
                                  title="Replace image"
                                >
                                  <ImagePlus className="w-5 h-5 text-white" />
                                </button>
                                <button
                                  onClick={() => setShowEnhancePanel(!showEnhancePanel)}
                                  className={cn(
                                    "p-2 rounded-full transition-all hover:scale-110 backdrop-blur-sm",
                                    showEnhancePanel ? "bg-amber-500 text-black" : "bg-white/20 hover:bg-white/30 text-white"
                                  )}
                                  title="Enhance image"
                                >
                                  <Wand2 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    handleImageGenerated({
                                      url: '',
                                      prompt: '',
                                      position: { x: 50, y: 50 },
                                      size: { width: 288, height: 288 },
                                      rotation: 0,
                                    });
                                    setShowEnhancePanel(false);
                                  }}
                                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-all hover:scale-110 backdrop-blur-sm"
                                  title="Remove image"
                                >
                                  <X className="w-5 h-5 text-white" />
                                </button>
                              </div>
                              
                              {/* Enhancement panel - slides out below image */}
                              <AnimatePresence>
                                {showEnhancePanel && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute -bottom-4 left-0 right-0 translate-y-full p-3 bg-black/80 backdrop-blur-md rounded-xl border border-white/20 z-30"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="text-xs text-white/70 mb-2 font-medium">Quick Enhancements:</div>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {getEnhancementSuggestions().slice(0, 4).map((suggestion, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleEnhanceImage(suggestion)}
                                          disabled={isEnhancing}
                                          className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-50"
                                        >
                                          {suggestion}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={customEnhancement}
                                        onChange={(e) => setCustomEnhancement(e.target.value)}
                                        placeholder="Custom enhancement..."
                                        className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && customEnhancement.trim()) {
                                            handleEnhanceImage(customEnhancement);
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => customEnhancement.trim() && handleEnhanceImage(customEnhancement)}
                                        disabled={isEnhancing || !customEnhancement.trim()}
                                        className="p-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors disabled:opacity-50"
                                      >
                                        {isEnhancing ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Send className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </>
                        ) : (
                          // Clickable placeholder - opens image generator
                          <button
                            onClick={() => setShowImageGenerator(true)}
                            className="w-full h-full flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-white/20"
                          >
                            {IconComponent ? (
                              <IconComponent className={cn("h-20 w-20 lg:h-24 lg:w-24 transition-transform group-hover:scale-110", colors.accent)} />
                            ) : (
                              <ImagePlus className={cn("h-20 w-20 lg:h-24 lg:w-24 transition-transform group-hover:scale-110", colors.accent)} />
                            )}
                            <span 
                              className="mt-4 text-sm font-semibold tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: colors.accentHex }}
                            >
                              + Add Image
                            </span>
                          </button>
                        )}
                        
                        {/* Resize handles - visible on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div
                            onMouseDown={handlePlaceholderResize('top-left')}
                            onTouchStart={handlePlaceholderResize('top-left')}
                            className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg z-20"
                          />
                          <div
                            onMouseDown={handlePlaceholderResize('top-right')}
                            onTouchStart={handlePlaceholderResize('top-right')}
                            className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg z-20"
                          />
                          <div
                            onMouseDown={handlePlaceholderResize('bottom-left')}
                            onTouchStart={handlePlaceholderResize('bottom-left')}
                            className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg z-20"
                          />
                          <div
                            onMouseDown={handlePlaceholderResize('bottom-right')}
                            onTouchStart={handlePlaceholderResize('bottom-right')}
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg z-20"
                          />
                        </div>
                      </div>
                    );
                  })()}
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
                        {stripAsterisks(slide.title)}
                      </span>
                    )}
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                  >
                    {slide.content.map((item, idx) => {
                      // Handle case where AI returns object with {heading, text} instead of string
                      const itemText = typeof item === 'object' && item !== null 
                        ? ((item as any).text || (item as any).heading || JSON.stringify(item))
                        : String(item || '');
                      
                      return (
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
                              value={itemText}
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
                              {stripAsterisks(itemText)}
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
                      );
                    })}
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

      {/* Live Session Controls for Teachers */}
      {user && selectedClassId && (
        <LiveSessionControls
          presentationId={presentation?.id || ''}
          presentationTitle={presentation?.title || ''}
          topic={presentation?.topic || ''}
          classId={selectedClassId}
          currentSlideIndex={currentSlide}
          currentSlideQuestion={slide?.question}
          themeAccentHex={colors.accentHex}
        />
      )}
    </div>
  );
}
