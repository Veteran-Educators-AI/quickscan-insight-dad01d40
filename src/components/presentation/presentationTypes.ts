/**
 * Shared presentation types.
 * 
 * IMPORTANT: These types are extracted into their own file to prevent
 * circular dependencies between NycologicPresents.tsx and presentationExport.ts.
 * Do NOT move these back into NycologicPresents.tsx.
 */

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
  wordProblem?: {
    problem: string;
    steps: string[];
    finalAnswer: string;
    progressiveReveal?: boolean;
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
  bgHex?: string;
  accentHex?: string;
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
