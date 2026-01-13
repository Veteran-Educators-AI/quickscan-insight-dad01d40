import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, BookOpen, Palette, Sparkles, Sun, Moon, Leaf, Flame, Waves, Zap } from 'lucide-react';
import { NYS_SUBJECTS, searchTopics, type Subject, type JMAPTopic } from '@/data/nysTopics';

export interface PresentationTheme {
  id: string;
  name: string;
  icon: React.ReactNode;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  slideColors: {
    title: { bg: string; text: string };
    objective: { bg: string; text: string };
    instruction: { bg: string; text: string };
    example: { bg: string; text: string };
    practice: { bg: string; text: string };
    summary: { bg: string; text: string };
  };
}

export const PRESENTATION_THEMES: PresentationTheme[] = [
  {
    id: 'vibrant',
    name: 'Vibrant',
    icon: <Sparkles className="h-4 w-4" />,
    colors: {
      primary: '6366F1',
      secondary: 'EC4899',
      accent: 'F59E0B',
      background: 'FFFFFF',
      text: '1F2937',
    },
    slideColors: {
      title: { bg: '6366F1', text: 'FFFFFF' },
      objective: { bg: '3B82F6', text: 'FFFFFF' },
      instruction: { bg: '10B981', text: 'FFFFFF' },
      example: { bg: 'A855F7', text: 'FFFFFF' },
      practice: { bg: 'F97316', text: 'FFFFFF' },
      summary: { bg: 'EC4899', text: 'FFFFFF' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    icon: <Waves className="h-4 w-4" />,
    colors: {
      primary: '0EA5E9',
      secondary: '06B6D4',
      accent: '14B8A6',
      background: 'F0F9FF',
      text: '0C4A6E',
    },
    slideColors: {
      title: { bg: '0369A1', text: 'FFFFFF' },
      objective: { bg: '0284C7', text: 'FFFFFF' },
      instruction: { bg: '0891B2', text: 'FFFFFF' },
      example: { bg: '0D9488', text: 'FFFFFF' },
      practice: { bg: '2563EB', text: 'FFFFFF' },
      summary: { bg: '7C3AED', text: 'FFFFFF' },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    icon: <Sun className="h-4 w-4" />,
    colors: {
      primary: 'F97316',
      secondary: 'EF4444',
      accent: 'FBBF24',
      background: 'FFFBEB',
      text: '78350F',
    },
    slideColors: {
      title: { bg: 'DC2626', text: 'FFFFFF' },
      objective: { bg: 'EA580C', text: 'FFFFFF' },
      instruction: { bg: 'D97706', text: 'FFFFFF' },
      example: { bg: 'DB2777', text: 'FFFFFF' },
      practice: { bg: 'C2410C', text: 'FFFFFF' },
      summary: { bg: 'BE185D', text: 'FFFFFF' },
    },
  },
  {
    id: 'nature',
    name: 'Nature Fresh',
    icon: <Leaf className="h-4 w-4" />,
    colors: {
      primary: '22C55E',
      secondary: '84CC16',
      accent: '10B981',
      background: 'F0FDF4',
      text: '14532D',
    },
    slideColors: {
      title: { bg: '15803D', text: 'FFFFFF' },
      objective: { bg: '16A34A', text: 'FFFFFF' },
      instruction: { bg: '059669', text: 'FFFFFF' },
      example: { bg: '0D9488', text: 'FFFFFF' },
      practice: { bg: '65A30D', text: 'FFFFFF' },
      summary: { bg: '4F46E5', text: 'FFFFFF' },
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    icon: <Moon className="h-4 w-4" />,
    colors: {
      primary: '8B5CF6',
      secondary: '06B6D4',
      accent: 'F472B6',
      background: '1F2937',
      text: 'F9FAFB',
    },
    slideColors: {
      title: { bg: '7C3AED', text: 'FFFFFF' },
      objective: { bg: '2563EB', text: 'FFFFFF' },
      instruction: { bg: '0891B2', text: 'FFFFFF' },
      example: { bg: 'DB2777', text: 'FFFFFF' },
      practice: { bg: 'EA580C', text: 'FFFFFF' },
      summary: { bg: '059669', text: 'FFFFFF' },
    },
  },
  {
    id: 'energy',
    name: 'High Energy',
    icon: <Zap className="h-4 w-4" />,
    colors: {
      primary: 'EAB308',
      secondary: 'F97316',
      accent: 'EF4444',
      background: 'FEFCE8',
      text: '713F12',
    },
    slideColors: {
      title: { bg: 'B45309', text: 'FFFFFF' },
      objective: { bg: 'DC2626', text: 'FFFFFF' },
      instruction: { bg: 'EA580C', text: 'FFFFFF' },
      example: { bg: 'C026D3', text: 'FFFFFF' },
      practice: { bg: 'CA8A04', text: 'FFFFFF' },
      summary: { bg: '7C3AED', text: 'FFFFFF' },
    },
  },
  {
    id: 'flame',
    name: 'Flame',
    icon: <Flame className="h-4 w-4" />,
    colors: {
      primary: 'EF4444',
      secondary: 'F97316',
      accent: 'FBBF24',
      background: 'FEF2F2',
      text: '7F1D1D',
    },
    slideColors: {
      title: { bg: 'B91C1C', text: 'FFFFFF' },
      objective: { bg: 'DC2626', text: 'FFFFFF' },
      instruction: { bg: 'EA580C', text: 'FFFFFF' },
      example: { bg: 'D97706', text: 'FFFFFF' },
      practice: { bg: 'C2410C', text: 'FFFFFF' },
      summary: { bg: '9333EA', text: 'FFFFFF' },
    },
  },
];

interface LessonTopicSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (topic: { topicName: string; standard: string; subject: string }, theme: PresentationTheme) => void;
}

export function LessonTopicSelector({ open, onOpenChange, onSelect }: LessonTopicSelectorProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<{ topicName: string; standard: string; subject: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('vibrant');

  const currentSubject = NYS_SUBJECTS.find(s => s.id === selectedSubject);
  const categories = currentSubject?.categories || [];
  const currentCategory = categories.find(c => c.category === selectedCategory);
  const topics = currentCategory?.topics || [];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchTopics(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const handleTopicSelect = (topic: JMAPTopic, subjectName: string) => {
    setSelectedTopic({
      topicName: topic.name,
      standard: topic.standard,
      subject: subjectName,
    });
  };

  const handleConfirm = () => {
    if (selectedTopic) {
      const theme = PRESENTATION_THEMES.find(t => t.id === selectedTheme) || PRESENTATION_THEMES[0];
      onSelect(selectedTopic, theme);
      // Reset state
      setSelectedSubject('');
      setSelectedCategory('');
      setSelectedTopic(null);
      setSearchQuery('');
      setSelectedTheme('vibrant');
    }
  };

  const resetSelection = () => {
    setSelectedSubject('');
    setSelectedCategory('');
    setSelectedTopic(null);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Choose Lesson Topic & Design
          </DialogTitle>
          <DialogDescription>
            Select a NYS standard topic and customize the presentation theme
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics by name or standard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Results</Label>
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <Card
                      key={idx}
                      className={`cursor-pointer transition-all hover:bg-accent/50 ${
                        selectedTopic?.topicName === result.topic.name ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleTopicSelect(result.topic, result.subject)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{result.topic.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.subject} • {result.category}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {result.topic.standard}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Browse by Subject */}
          {!searchQuery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={(v) => {
                    setSelectedSubject(v);
                    setSelectedCategory('');
                    setSelectedTopic(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {NYS_SUBJECTS.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={selectedCategory} 
                    onValueChange={(v) => {
                      setSelectedCategory(v);
                      setSelectedTopic(null);
                    }}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Topics List */}
              {topics.length > 0 && (
                <div className="space-y-2">
                  <Label>Topics</Label>
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    <div className="space-y-2">
                      {topics.map((topic, idx) => (
                        <Card
                          key={idx}
                          className={`cursor-pointer transition-all hover:bg-accent/50 ${
                            selectedTopic?.topicName === topic.name ? 'ring-2 ring-primary bg-primary/5' : ''
                          }`}
                          onClick={() => handleTopicSelect(topic, currentSubject?.name || '')}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <span className="text-sm font-medium">{topic.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {topic.standard}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Selected Topic Display */}
          {selectedTopic && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{selectedTopic.topicName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTopic.subject} • {selectedTopic.standard}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetSelection}>
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Presentation Theme
            </Label>
            <RadioGroup
              value={selectedTheme}
              onValueChange={setSelectedTheme}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {PRESENTATION_THEMES.map((theme) => (
                <div key={theme.id}>
                  <RadioGroupItem
                    value={theme.id}
                    id={theme.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={theme.id}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                  >
                    <div 
                      className="w-full h-8 rounded-md flex items-center justify-center gap-1"
                      style={{ 
                        background: `linear-gradient(135deg, #${theme.colors.primary}, #${theme.colors.secondary})` 
                      }}
                    >
                      {theme.icon}
                    </div>
                    <span className="text-xs font-medium">{theme.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Theme Preview */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Slide color preview:</p>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(PRESENTATION_THEMES.find(t => t.id === selectedTheme)?.slideColors || {}).map(([type, colors]) => (
                  <div
                    key={type}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: `#${colors.bg}`, color: `#${colors.text}` }}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTopic}>
            Create Lesson
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
