import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Image, X, Trash2 } from 'lucide-react';

export interface ClipartItem {
  id: string;
  name: string;
  category: string;
  svg: string;
  color?: string;
}

export interface SlideClipart {
  clipartId: string;
  position: 'top-right' | 'bottom-right' | 'bottom-left' | 'center-right' | 'custom';
  size: 'small' | 'medium' | 'large';
  // Custom x/y position as percentage (0-100)
  x?: number;
  y?: number;
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
];

const categories = [
  { id: 'shapes', label: 'Shapes' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'tools', label: 'Tools' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'decorative', label: 'Decorative' },
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
  const [selectedCategory, setSelectedCategory] = useState('shapes');
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSize, setPendingSize] = useState<SlideClipart['size']>('medium');

  const addClipart = (clipartId: string) => {
    // Add new clipart at center position (will be draggable)
    const newClipart: SlideClipart = {
      clipartId,
      position: 'custom',
      size: pendingSize,
      x: 75, // Default to right side
      y: 25, // Default to top area
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

  const getClipartById = (id: string) => clipartLibrary.find(c => c.id === id);

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
                  return (
                    <div key={index} className="flex items-center gap-1">
                      <Badge variant="outline" className="gap-1 pr-1">
                        <span className="text-xs">{clipart?.name}</span>
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
            <TabsList className="w-full h-8">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs px-2 py-1">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
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
