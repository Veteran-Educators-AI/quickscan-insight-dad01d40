import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Image, X, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClipartItem {
  id: string;
  name: string;
  category: string;
  svg: string;
  color?: string;
  // For AI-generated images
  imageUrl?: string;
  isGenerated?: boolean;
}

export interface SlideClipart {
  clipartId: string;
  position: 'top-right' | 'bottom-right' | 'bottom-left' | 'center-right' | 'custom';
  size: 'small' | 'medium' | 'large';
  // Custom x/y position as percentage (0-100)
  x?: number;
  y?: number;
  // For AI-generated images
  imageUrl?: string;
  isGenerated?: boolean;
}

// Math-themed clipart library using SVG
const clipartLibrary: ClipartItem[] = [
  // Shapes
  {
    id: 'circle',
    name: 'Circle',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'square',
    name: 'Square',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'shapes',
    svg: `<svg viewBox="0 0 120 80"><rect x="10" y="10" width="100" height="60" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,38 77,92 23,92 5,38" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram',
    category: 'shapes',
    svg: `<svg viewBox="0 0 120 80"><polygon points="30,10 110,10 90,70 10,70" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'trapezoid',
    name: 'Trapezoid',
    category: 'shapes',
    svg: `<svg viewBox="0 0 120 80"><polygon points="30,10 90,10 110,70 10,70" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  {
    id: 'rhombus',
    name: 'Rhombus',
    category: 'shapes',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="currentColor" stroke-width="4"/></svg>`,
  },
  // Math symbols
  {
    id: 'plus',
    name: 'Plus Sign',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" stroke-width="8"/><line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="8"/></svg>`,
  },
  {
    id: 'minus',
    name: 'Minus Sign',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="8"/></svg>`,
  },
  {
    id: 'multiply',
    name: 'Multiply',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" stroke-width="8"/><line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" stroke-width="8"/></svg>`,
  },
  {
    id: 'divide',
    name: 'Divide',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="6"/><circle cx="50" cy="25" r="8" fill="currentColor"/><circle cx="50" cy="75" r="8" fill="currentColor"/></svg>`,
  },
  {
    id: 'equals',
    name: 'Equals',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="35" x2="90" y2="35" stroke="currentColor" stroke-width="8"/><line x1="10" y1="65" x2="90" y2="65" stroke="currentColor" stroke-width="8"/></svg>`,
  },
  {
    id: 'pi',
    name: 'Pi',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><text x="50" y="75" font-size="70" text-anchor="middle" fill="currentColor" font-family="serif">π</text></svg>`,
  },
  {
    id: 'sigma',
    name: 'Sigma',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><text x="50" y="75" font-size="70" text-anchor="middle" fill="currentColor" font-family="serif">Σ</text></svg>`,
  },
  {
    id: 'sqrt',
    name: 'Square Root',
    category: 'symbols',
    svg: `<svg viewBox="0 0 100 100"><path d="M10 60 L25 60 L40 90 L70 20 L90 20" fill="none" stroke="currentColor" stroke-width="6"/></svg>`,
  },
  // Tools
  {
    id: 'ruler',
    name: 'Ruler',
    category: 'tools',
    svg: `<svg viewBox="0 0 120 40"><rect x="5" y="5" width="110" height="30" fill="none" stroke="currentColor" stroke-width="3"/><line x1="15" y1="5" x2="15" y2="20" stroke="currentColor" stroke-width="2"/><line x1="30" y1="5" x2="30" y2="15" stroke="currentColor" stroke-width="2"/><line x1="45" y1="5" x2="45" y2="20" stroke="currentColor" stroke-width="2"/><line x1="60" y1="5" x2="60" y2="15" stroke="currentColor" stroke-width="2"/><line x1="75" y1="5" x2="75" y2="20" stroke="currentColor" stroke-width="2"/><line x1="90" y1="5" x2="90" y2="15" stroke="currentColor" stroke-width="2"/><line x1="105" y1="5" x2="105" y2="20" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'protractor',
    name: 'Protractor',
    category: 'tools',
    svg: `<svg viewBox="0 0 100 60"><path d="M5 55 A50 50 0 0 1 95 55" fill="none" stroke="currentColor" stroke-width="3"/><line x1="5" y1="55" x2="95" y2="55" stroke="currentColor" stroke-width="3"/><line x1="50" y1="55" x2="50" y2="10" stroke="currentColor" stroke-width="2"/><line x1="50" y1="55" x2="25" y2="15" stroke="currentColor" stroke-width="1"/><line x1="50" y1="55" x2="75" y2="15" stroke="currentColor" stroke-width="1"/></svg>`,
  },
  {
    id: 'compass',
    name: 'Compass',
    category: 'tools',
    svg: `<svg viewBox="0 0 100 100"><line x1="50" y1="10" x2="30" y2="90" stroke="currentColor" stroke-width="4"/><line x1="50" y1="10" x2="70" y2="90" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="10" r="6" fill="currentColor"/><circle cx="30" cy="90" r="3" fill="currentColor"/></svg>`,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    category: 'tools',
    svg: `<svg viewBox="0 0 80 100"><rect x="5" y="5" width="70" height="90" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="12" width="56" height="20" fill="currentColor" opacity="0.3"/><rect x="12" y="40" width="12" height="12" fill="currentColor"/><rect x="34" y="40" width="12" height="12" fill="currentColor"/><rect x="56" y="40" width="12" height="12" fill="currentColor"/><rect x="12" y="58" width="12" height="12" fill="currentColor"/><rect x="34" y="58" width="12" height="12" fill="currentColor"/><rect x="56" y="58" width="12" height="12" fill="currentColor"/><rect x="12" y="76" width="12" height="12" fill="currentColor"/><rect x="34" y="76" width="12" height="12" fill="currentColor"/><rect x="56" y="76" width="12" height="12" fill="currentColor"/></svg>`,
  },
  // Graphs
  {
    id: 'coordinate-plane',
    name: 'Coordinate Plane',
    category: 'graphs',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="3"/><line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" stroke-width="3"/><polygon points="90,50 82,46 82,54" fill="currentColor"/><polygon points="50,10 46,18 54,18" fill="currentColor"/></svg>`,
  },
  {
    id: 'line-graph',
    name: 'Line Graph',
    category: 'graphs',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="90" x2="10" y2="10" stroke="currentColor" stroke-width="2"/><line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" stroke-width="2"/><polyline points="15,70 30,50 50,60 70,30 85,40" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="15" cy="70" r="4" fill="currentColor"/><circle cx="30" cy="50" r="4" fill="currentColor"/><circle cx="50" cy="60" r="4" fill="currentColor"/><circle cx="70" cy="30" r="4" fill="currentColor"/><circle cx="85" cy="40" r="4" fill="currentColor"/></svg>`,
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    category: 'graphs',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="90" x2="10" y2="10" stroke="currentColor" stroke-width="2"/><line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" stroke-width="2"/><rect x="20" y="50" width="12" height="40" fill="currentColor" opacity="0.7"/><rect x="38" y="30" width="12" height="60" fill="currentColor" opacity="0.7"/><rect x="56" y="45" width="12" height="45" fill="currentColor" opacity="0.7"/><rect x="74" y="20" width="12" height="70" fill="currentColor" opacity="0.7"/></svg>`,
  },
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    category: 'graphs',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="3"/><line x1="50" y1="50" x2="50" y2="10" stroke="currentColor" stroke-width="2"/><line x1="50" y1="50" x2="85" y2="65" stroke="currentColor" stroke-width="2"/><line x1="50" y1="50" x2="20" y2="75" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  // Decorative
  {
    id: 'lightbulb',
    name: 'Lightbulb',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100"><path d="M50 10 C25 10 15 30 15 45 C15 60 35 65 35 80 L65 80 C65 65 85 60 85 45 C85 30 75 10 50 10" fill="none" stroke="currentColor" stroke-width="3"/><line x1="35" y1="85" x2="65" y2="85" stroke="currentColor" stroke-width="3"/><line x1="38" y1="90" x2="62" y2="90" stroke="currentColor" stroke-width="3"/><line x1="42" y1="95" x2="58" y2="95" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: 'star',
    name: 'Star',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: 'checkmark',
    name: 'Checkmark',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100"><polyline points="20,55 40,75 80,25" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'arrow-right',
    name: 'Arrow Right',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100"><line x1="10" y1="50" x2="80" y2="50" stroke="currentColor" stroke-width="6"/><polyline points="60,30 80,50 60,70" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'question-mark',
    name: 'Question Mark',
    category: 'decorative',
    svg: `<svg viewBox="0 0 100 100"><path d="M35 35 Q35 15 50 15 Q70 15 70 35 Q70 50 50 55 L50 65" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="80" r="5" fill="currentColor"/></svg>`,
  },
  // Science
  {
    id: 'atom',
    name: 'Atom',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="8" fill="currentColor"/><ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(120 50 50)"/></svg>`,
  },
  {
    id: 'microscope',
    name: 'Microscope',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><rect x="42" y="20" width="16" height="45" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="75" r="10" fill="none" stroke="currentColor" stroke-width="3"/><line x1="25" y1="90" x2="75" y2="90" stroke="currentColor" stroke-width="4"/><line x1="50" y1="10" x2="50" y2="20" stroke="currentColor" stroke-width="3"/><rect x="35" y="40" width="30" height="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'beaker',
    name: 'Beaker',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><path d="M25 90 L25 35 L40 35 L40 20 L60 20 L60 35 L75 35 L75 90 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" stroke-width="2"/><line x1="30" y1="65" x2="70" y2="65" stroke="currentColor" stroke-width="2"/><ellipse cx="50" cy="75" rx="15" ry="8" fill="currentColor" opacity="0.3"/></svg>`,
  },
  {
    id: 'test-tube',
    name: 'Test Tube',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><path d="M40 15 L40 70 Q40 85 50 85 Q60 85 60 70 L60 15" fill="none" stroke="currentColor" stroke-width="3"/><line x1="35" y1="15" x2="65" y2="15" stroke="currentColor" stroke-width="3"/><ellipse cx="50" cy="70" rx="8" ry="10" fill="currentColor" opacity="0.3"/></svg>`,
  },
  {
    id: 'dna',
    name: 'DNA Helix',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><path d="M30 10 Q50 25 70 10 Q50 -5 30 10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 35 Q50 50 70 35 Q50 20 30 35" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 60 Q50 75 70 60 Q50 45 30 60" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 85 Q50 100 70 85 Q50 70 30 85" fill="none" stroke="currentColor" stroke-width="3"/><line x1="30" y1="10" x2="30" y2="85" stroke="currentColor" stroke-width="2"/><line x1="70" y1="10" x2="70" y2="85" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'magnet',
    name: 'Magnet',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><path d="M20 40 L20 70 Q20 85 50 85 Q80 85 80 70 L80 40" fill="none" stroke="currentColor" stroke-width="4"/><rect x="15" y="25" width="20" height="20" fill="currentColor" opacity="0.5"/><rect x="65" y="25" width="20" height="20" fill="currentColor" opacity="0.3"/><text x="25" y="40" font-size="12" fill="currentColor" text-anchor="middle">N</text><text x="75" y="40" font-size="12" fill="currentColor" text-anchor="middle">S</text></svg>`,
  },
  {
    id: 'planet',
    name: 'Planet',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-20 50 50)"/></svg>`,
  },
  {
    id: 'thermometer',
    name: 'Thermometer',
    category: 'science',
    svg: `<svg viewBox="0 0 100 100"><rect x="42" y="10" width="16" height="55" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="78" r="15" fill="none" stroke="currentColor" stroke-width="3"/><rect x="46" y="35" width="8" height="35" fill="currentColor" opacity="0.5"/><circle cx="50" cy="78" r="10" fill="currentColor" opacity="0.5"/></svg>`,
  },
  // History
  {
    id: 'scroll',
    name: 'Scroll',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><path d="M20 20 Q15 20 15 30 L15 80 Q15 90 25 90 L75 90 Q85 90 85 80 L85 30 Q85 20 75 20" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="20" cy="20" rx="8" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="80" cy="90" rx="8" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="25" y1="40" x2="75" y2="40" stroke="currentColor" stroke-width="2"/><line x1="25" y1="55" x2="75" y2="55" stroke="currentColor" stroke-width="2"/><line x1="25" y1="70" x2="60" y2="70" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'castle',
    name: 'Castle',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><rect x="20" y="40" width="60" height="50" fill="none" stroke="currentColor" stroke-width="3"/><rect x="10" y="30" width="15" height="60" fill="none" stroke="currentColor" stroke-width="3"/><rect x="75" y="30" width="15" height="60" fill="none" stroke="currentColor" stroke-width="3"/><rect x="40" y="65" width="20" height="25" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10" y="20" width="5" height="10" fill="currentColor"/><rect x="20" y="20" width="5" height="10" fill="currentColor"/><rect x="75" y="20" width="5" height="10" fill="currentColor"/><rect x="85" y="20" width="5" height="10" fill="currentColor"/></svg>`,
  },
  {
    id: 'crown',
    name: 'Crown',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><path d="M15 70 L15 40 L30 55 L50 30 L70 55 L85 40 L85 70 Z" fill="none" stroke="currentColor" stroke-width="3"/><rect x="15" y="70" width="70" height="15" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="15" cy="40" r="5" fill="currentColor"/><circle cx="50" cy="30" r="5" fill="currentColor"/><circle cx="85" cy="40" r="5" fill="currentColor"/></svg>`,
  },
  {
    id: 'quill',
    name: 'Quill Pen',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><path d="M80 10 Q70 20 60 40 Q50 60 25 85 L20 90 L25 85 Q45 80 65 60 Q85 40 90 20 Q85 15 80 10" fill="none" stroke="currentColor" stroke-width="3"/><line x1="20" y1="90" x2="15" y2="95" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'compass-rose',
    name: 'Compass Rose',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="50,15 55,45 50,50 45,45" fill="currentColor"/><polygon points="50,85 55,55 50,50 45,55" fill="currentColor" opacity="0.5"/><polygon points="15,50 45,45 50,50 45,55" fill="currentColor" opacity="0.5"/><polygon points="85,50 55,45 50,50 55,55" fill="currentColor" opacity="0.5"/><text x="50" y="12" font-size="8" text-anchor="middle" fill="currentColor">N</text></svg>`,
  },
  {
    id: 'amphora',
    name: 'Amphora',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="25" rx="15" ry="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M35 25 Q30 40 30 60 Q30 85 50 90 Q70 85 70 60 Q70 40 65 25" fill="none" stroke="currentColor" stroke-width="3"/><path d="M35 30 Q20 35 20 50 Q20 55 30 55" fill="none" stroke="currentColor" stroke-width="2"/><path d="M65 30 Q80 35 80 50 Q80 55 70 55" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><line x1="25" y1="15" x2="75" y2="15" stroke="currentColor" stroke-width="4"/><line x1="25" y1="85" x2="75" y2="85" stroke="currentColor" stroke-width="4"/><path d="M30 15 L30 35 Q30 50 50 50 Q70 50 70 35 L70 15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M30 85 L30 65 Q30 50 50 50 Q70 50 70 65 L70 85" fill="none" stroke="currentColor" stroke-width="3"/><polygon points="35,20 65,20 50,40" fill="currentColor" opacity="0.3"/></svg>`,
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'history',
    svg: `<svg viewBox="0 0 100 100"><path d="M50 10 L85 25 L85 50 Q85 80 50 95 Q15 80 15 50 L15 25 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="50" y1="25" x2="50" y2="80" stroke="currentColor" stroke-width="2"/><line x1="25" y1="45" x2="75" y2="45" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  // Language Arts
  {
    id: 'book-open',
    name: 'Open Book',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><path d="M10 25 Q25 20 50 25 Q75 20 90 25 L90 80 Q75 75 50 80 Q25 75 10 80 Z" fill="none" stroke="currentColor" stroke-width="3"/><line x1="50" y1="25" x2="50" y2="80" stroke="currentColor" stroke-width="2"/><line x1="20" y1="40" x2="45" y2="40" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="50" x2="45" y2="50" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="60" x2="45" y2="60" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="40" x2="80" y2="40" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="50" x2="80" y2="50" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="60" x2="80" y2="60" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'pencil',
    name: 'Pencil',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><polygon points="75,10 90,25 25,90 10,90 10,75" fill="none" stroke="currentColor" stroke-width="3"/><line x1="65" y1="20" x2="80" y2="35" stroke="currentColor" stroke-width="2"/><polygon points="10,90 10,75 25,90" fill="currentColor"/></svg>`,
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><path d="M15 25 Q15 15 30 15 L70 15 Q85 15 85 25 L85 55 Q85 65 70 65 L40 65 L25 80 L30 65 L30 65 Q15 65 15 55 Z" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
  },
  {
    id: 'abc',
    name: 'ABC Letters',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><text x="15" y="65" font-size="35" fill="currentColor" font-family="serif" font-weight="bold">A</text><text x="40" y="65" font-size="35" fill="currentColor" font-family="serif" font-weight="bold">B</text><text x="65" y="65" font-size="35" fill="currentColor" font-family="serif" font-weight="bold">C</text></svg>`,
  },
  {
    id: 'quotation',
    name: 'Quote Marks',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><path d="M20 30 Q20 20 30 20 Q40 20 40 30 Q40 50 25 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M55 30 Q55 20 65 20 Q75 20 75 30 Q75 50 60 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'theater-masks',
    name: 'Theater Masks',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><ellipse cx="35" cy="45" rx="25" ry="30" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="65" cy="55" rx="25" ry="30" fill="none" stroke="currentColor" stroke-width="3"/><path d="M25 55 Q35 65 45 55" fill="none" stroke="currentColor" stroke-width="2"/><path d="M55 65 Q65 55 75 65" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="28" cy="38" r="4" fill="currentColor"/><circle cx="42" cy="38" r="4" fill="currentColor"/><circle cx="58" cy="48" r="4" fill="currentColor"/><circle cx="72" cy="48" r="4" fill="currentColor"/></svg>`,
  },
  {
    id: 'dictionary',
    name: 'Dictionary',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><rect x="20" y="15" width="60" height="75" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><line x1="30" y1="15" x2="30" y2="90" stroke="currentColor" stroke-width="2"/><text x="55" y="55" font-size="20" fill="currentColor" font-family="serif" font-weight="bold">Aa</text></svg>`,
  },
  {
    id: 'paper',
    name: 'Paper',
    category: 'language',
    svg: `<svg viewBox="0 0 100 100"><path d="M25 10 L65 10 L80 25 L80 90 L25 90 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M65 10 L65 25 L80 25" fill="none" stroke="currentColor" stroke-width="2"/><line x1="35" y1="40" x2="70" y2="40" stroke="currentColor" stroke-width="2"/><line x1="35" y1="55" x2="70" y2="55" stroke="currentColor" stroke-width="2"/><line x1="35" y1="70" x2="55" y2="70" stroke="currentColor" stroke-width="2"/></svg>`,
  },
];

const categories = [
  { id: 'ai-generate', label: '✨ AI' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'symbols', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'history', label: 'History' },
  { id: 'language', label: 'ELA' },
  { id: 'tools', label: 'Tools' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'decorative', label: 'Icons' },
];

const sizes = [
  { id: 'small' as const, label: 'S', width: 0.6 },
  { id: 'medium' as const, label: 'M', width: 0.9 },
  { id: 'large' as const, label: 'L', width: 1.2 },
];

interface SlideClipartPickerProps {
  slideClipart: SlideClipart[];
  onClipartChange: (clipart: SlideClipart[]) => void;
  disabled?: boolean;
}

export function SlideClipartPicker({ slideClipart, onClipartChange, disabled }: SlideClipartPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('ai-generate');
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSize, setPendingSize] = useState<SlideClipart['size']>('medium');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ClipartItem[]>([]);

  const addClipart = (clipartId: string, imageUrl?: string, isGenerated?: boolean) => {
    // Add new clipart at center position (will be draggable)
    const newClipart: SlideClipart = {
      clipartId,
      position: 'custom',
      size: pendingSize,
      x: 75, // Default to right side
      y: 25, // Default to top area
      imageUrl,
      isGenerated,
    };
    onClipartChange([...slideClipart, newClipart]);
  };

  const removeClipart = (index: number) => {
    onClipartChange(slideClipart.filter((_, i) => i !== index));
  };

  const updateClipartPosition = (index: number, x: number, y: number) => {
    const updated = [...slideClipart];
    updated[index] = { ...updated[index], position: 'custom', x, y };
    onClipartChange(updated);
  };

  const updateClipartSize = (index: number, size: SlideClipart['size']) => {
    const updated = [...slideClipart];
    updated[index] = { ...updated[index], size };
    onClipartChange(updated);
  };

  const getClipartById = (id: string) => {
    // Check generated images first
    const generated = generatedImages.find(c => c.id === id);
    if (generated) return generated;
    return clipartLibrary.find(c => c.id === id);
  };

  const generateAIClipart = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for the clipart');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram-images', {
        body: {
          prompt: `Create a simple, clean clipart icon suitable for a PowerPoint presentation: ${aiPrompt}. Make it a simple vector-style illustration with clean lines, suitable for educational materials. Use a transparent or white background. The image should be iconic and easy to recognize at small sizes.`,
          style: 'clipart',
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newClipart: ClipartItem = {
          id: `ai-${Date.now()}`,
          name: aiPrompt.slice(0, 20) + (aiPrompt.length > 20 ? '...' : ''),
          category: 'ai-generated',
          svg: '',
          imageUrl: data.imageUrl,
          isGenerated: true,
        };
        setGeneratedImages(prev => [...prev, newClipart]);
        toast.success('Clipart generated! Click to add it to your slide.');
        setAiPrompt('');
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error generating clipart:', error);
      toast.error('Failed to generate clipart. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-inherit hover:bg-white/20"
          disabled={disabled}
          title="Add clipart to slide"
        >
          <Image className="h-4 w-4" />
          {slideClipart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {slideClipart.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Add Clipart</h4>
            {slideClipart.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {slideClipart.length} added
              </Badge>
            )}
          </div>

          {/* Current clipart on slide */}
          {slideClipart.length > 0 && (
            <div className="border rounded-md p-2 space-y-1">
              <p className="text-xs text-muted-foreground">On this slide (drag to reposition):</p>
              <div className="flex flex-wrap gap-1">
                {slideClipart.map((item, index) => {
                  const clipart = getClipartById(item.clipartId);
                  const displayName = item.isGenerated ? item.clipartId.replace('ai-', 'AI ') : clipart?.name;
                  return (
                    <div key={index} className="flex items-center gap-1">
                      <Badge variant="outline" className="gap-1 pr-1">
                        {item.isGenerated && <Sparkles className="h-3 w-3 text-amber-500" />}
                        <span className="text-xs">{displayName}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          {sizes.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => updateClipartSize(index, s.id)}
                              className={`text-[9px] w-4 h-4 rounded ${
                                item.size === s.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => removeClipart(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size selection for new clipart */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Size for new clipart</label>
            <div className="flex gap-1">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPendingSize(s.id)}
                  className={`text-xs w-7 h-7 rounded border transition-colors ${
                    pendingSize === s.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full h-8 overflow-x-auto">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-1.5 py-1">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* AI Generate Tab */}
            <TabsContent value="ai-generate" className="mt-2">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Describe clipart (e.g., 'happy student', 'math equation')"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isGenerating && generateAIClipart()}
                    disabled={isGenerating}
                    className="text-xs h-8"
                  />
                  <Button
                    size="sm"
                    onClick={generateAIClipart}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="h-8 px-3"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Generated images */}
                {generatedImages.length > 0 && (
                  <ScrollArea className="h-24">
                    <div className="grid grid-cols-4 gap-2">
                      {generatedImages.map((clipart) => {
                        const isAdded = slideClipart.some(c => c.clipartId === clipart.id);
                        return (
                          <button
                            key={clipart.id}
                            onClick={() => addClipart(clipart.id, clipart.imageUrl, true)}
                            className={`p-1 rounded border hover:bg-muted transition-colors relative ${
                              isAdded ? 'ring-1 ring-primary/50 bg-primary/5' : ''
                            }`}
                            title={clipart.name}
                          >
                            <img
                              src={clipart.imageUrl}
                              alt={clipart.name}
                              className="w-12 h-12 object-contain rounded"
                            />
                            {isAdded && (
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                
                {generatedImages.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border rounded-md border-dashed">
                    <div className="text-center">
                      <Sparkles className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      <p>Generate custom clipart with AI</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Standard category tabs */}
            {categories.filter(cat => cat.id !== 'ai-generate').map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-2">
                <ScrollArea className="h-32">
                  <div className="grid grid-cols-5 gap-2">
                    {clipartLibrary
                      .filter((c) => c.category === cat.id)
                      .map((clipart) => {
                        const isAdded = slideClipart.some(c => c.clipartId === clipart.id);
                        return (
                          <button
                            key={clipart.id}
                            onClick={() => addClipart(clipart.id)}
                            className={`p-2 rounded border hover:bg-muted transition-colors relative ${
                              isAdded ? 'ring-1 ring-primary/50 bg-primary/5' : ''
                            }`}
                            title={clipart.name}
                          >
                            <div
                              className="w-8 h-8 text-foreground"
                              dangerouslySetInnerHTML={{ __html: clipart.svg }}
                            />
                            {isAdded && (
                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] rounded-full w-3 h-3 flex items-center justify-center">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          <p className="text-[10px] text-muted-foreground text-center">
            Click to add • Drag on slide to reposition
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper functions for PowerPoint export
export const getClipartSvg = (clipartId: string): string | null => {
  const clipart = clipartLibrary.find(c => c.id === clipartId);
  return clipart?.svg || null;
};

export const getClipartPosition = (
  position: SlideClipart['position'],
  size: SlideClipart['size'],
  customX?: number,
  customY?: number
): { x: number; y: number; w: number; h: number } => {
  const sizeMap = { small: 0.6, medium: 0.9, large: 1.2 };
  const dimension = sizeMap[size];
  
  // If custom position, use percentage-based coordinates
  if (position === 'custom' && customX !== undefined && customY !== undefined) {
    // Convert percentage to PowerPoint inches (assuming 10" x 7.5" slide)
    const slideWidth = 10;
    const slideHeight = 7.5;
    return {
      x: (customX / 100) * slideWidth - dimension / 2,
      y: (customY / 100) * slideHeight - dimension / 2,
      w: dimension,
      h: dimension,
    };
  }
  
  // Preset positions
  const positions: Record<string, { x: number; y: number }> = {
    'top-right': { x: 8.5 - dimension, y: 0.5 },
    'bottom-right': { x: 8.5 - dimension, y: 6.5 - dimension },
    'bottom-left': { x: 0.5, y: 6.5 - dimension },
    'center-right': { x: 8.5 - dimension, y: 3.25 - dimension / 2 },
  };

  const pos = positions[position] || positions['top-right'];
  return { ...pos, w: dimension, h: dimension };
};

// Export clipart library for external use
export const getClipartLibrary = () => clipartLibrary;
