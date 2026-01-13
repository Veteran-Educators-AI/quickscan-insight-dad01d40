import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSpreadsheet, Download } from 'lucide-react';

interface LessonSlide {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes: string;
  slideType: 'title' | 'objective' | 'instruction' | 'example' | 'practice' | 'summary';
}

interface StudentHandoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: LessonSlide[];
  onGenerate: (options: HandoutOptions) => void;
}

export interface HandoutOptions {
  blanksPerSection: number;
  includedSlideIndices: number[];
  includeAnswerKey: boolean;
  includeObjective: boolean;
  includePracticeWorkSpace: boolean;
}

export function StudentHandoutDialog({
  open,
  onOpenChange,
  slides,
  onGenerate,
}: StudentHandoutDialogProps) {
  const [blanksPerSection, setBlanksPerSection] = useState(2);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(
    new Set(slides.map((_, i) => i))
  );
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [includeObjective, setIncludeObjective] = useState(true);
  const [includePracticeWorkSpace, setIncludePracticeWorkSpace] = useState(true);

  const toggleSlide = (index: number) => {
    const newSelected = new Set(selectedSlides);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSlides(newSelected);
  };

  const selectAll = () => {
    setSelectedSlides(new Set(slides.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedSlides(new Set());
  };

  const handleGenerate = () => {
    onGenerate({
      blanksPerSection,
      includedSlideIndices: Array.from(selectedSlides).sort((a, b) => a - b),
      includeAnswerKey,
      includeObjective,
      includePracticeWorkSpace,
    });
    onOpenChange(false);
  };

  const getSlideTypeColor = (type: LessonSlide['slideType']) => {
    switch (type) {
      case 'title': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'objective': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'instruction': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'example': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'practice': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'summary': return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Customize Student Handout
          </DialogTitle>
          <DialogDescription>
            Choose how many blanks to include and which slides to use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Blanks per section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Blanks per section</Label>
              <span className="text-sm font-medium text-muted-foreground">
                {blanksPerSection} {blanksPerSection === 1 ? 'blank' : 'blanks'}
              </span>
            </div>
            <Slider
              value={[blanksPerSection]}
              onValueChange={(value) => setBlanksPerSection(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              More blanks = more challenging for students
            </p>
          </div>

          {/* General options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeObjective"
                  checked={includeObjective}
                  onCheckedChange={(checked) => setIncludeObjective(checked as boolean)}
                />
                <label htmlFor="includeObjective" className="text-sm cursor-pointer">
                  Include learning objective
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includePracticeWorkSpace"
                  checked={includePracticeWorkSpace}
                  onCheckedChange={(checked) => setIncludePracticeWorkSpace(checked as boolean)}
                />
                <label htmlFor="includePracticeWorkSpace" className="text-sm cursor-pointer">
                  Include work space for practice problems
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeAnswerKey"
                  checked={includeAnswerKey}
                  onCheckedChange={(checked) => setIncludeAnswerKey(checked as boolean)}
                />
                <label htmlFor="includeAnswerKey" className="text-sm cursor-pointer">
                  Include answer key (teacher copy)
                </label>
              </div>
            </div>
          </div>

          {/* Slide selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Include slides</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="h-7 text-xs">
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-48 rounded-md border">
              <div className="p-3 space-y-2">
                {slides.map((slide, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`slide-${index}`}
                      checked={selectedSlides.has(index)}
                      onCheckedChange={() => toggleSlide(index)}
                    />
                    <label
                      htmlFor={`slide-${index}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <span className="text-muted-foreground w-6">#{slide.slideNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getSlideTypeColor(slide.slideType)}`}>
                        {slide.slideType}
                      </span>
                      <span className="truncate">{slide.title}</span>
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedSlides.size} of {slides.length} slides selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={selectedSlides.size === 0}>
            <Download className="h-4 w-4 mr-2" />
            Generate Handout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
