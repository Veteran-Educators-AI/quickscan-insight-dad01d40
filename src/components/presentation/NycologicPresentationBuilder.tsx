import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Play, Save, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { NycologicPresents, NycologicPresentation, PresentationSlide } from './NycologicPresents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import nyclogicLogo from '@/assets/nyclogic-presents-logo.png';

interface NycologicPresentationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: {
    topicName: string;
    standard: string;
    subject?: string;
  } | null;
}

export function NycologicPresentationBuilder({ open, onOpenChange, topic }: NycologicPresentationBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentation, setPresentation] = useState<NycologicPresentation | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState(topic?.topicName || '');
  const [subject, setSubject] = useState(topic?.subject || 'Mathematics');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30 minutes');
  const [includeQuestions, setIncludeQuestions] = useState(true);
  const [questionCount, setQuestionCount] = useState('3');
  const [style, setStyle] = useState<'engaging' | 'formal' | 'story'>('engaging');
  const [visualTheme, setVisualTheme] = useState<string>('neon-city');

  // Visual theme options with colorful designs
  const visualThemes = [
    {
      id: 'neon-city',
      name: 'Neon City',
      description: 'Vibrant NYC skyline vibes',
      gradient: 'from-purple-600 via-pink-500 to-orange-400',
      accent: 'bg-pink-500',
      emoji: '🌆',
      pattern: 'radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.4) 0%, transparent 50%)',
    },
    {
      id: 'ocean-wave',
      name: 'Ocean Wave',
      description: 'Cool and calming blues',
      gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
      accent: 'bg-cyan-400',
      emoji: '🌊',
      pattern: 'radial-gradient(circle at 30% 70%, rgba(34, 211, 238, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.4) 0%, transparent 50%)',
    },
    {
      id: 'sunset-glow',
      name: 'Sunset Glow',
      description: 'Warm golden hour colors',
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      accent: 'bg-amber-400',
      emoji: '🌅',
      pattern: 'radial-gradient(circle at 50% 100%, rgba(251, 191, 36, 0.4) 0%, transparent 50%), radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.3) 0%, transparent 50%)',
    },
    {
      id: 'forest-zen',
      name: 'Forest Zen',
      description: 'Natural earthy greens',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
      accent: 'bg-emerald-400',
      emoji: '🌿',
      pattern: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(20, 184, 166, 0.4) 0%, transparent 50%)',
    },
    {
      id: 'galaxy-dreams',
      name: 'Galaxy Dreams',
      description: 'Deep space exploration',
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
      accent: 'bg-violet-400',
      emoji: '✨',
      pattern: 'radial-gradient(circle at 10% 10%, rgba(139, 92, 246, 0.5) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(192, 38, 211, 0.4) 0%, transparent 40%)',
    },
    {
      id: 'candy-pop',
      name: 'Candy Pop',
      description: 'Fun and playful pastels',
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      accent: 'bg-rose-300',
      emoji: '🍭',
      pattern: 'radial-gradient(circle at 25% 25%, rgba(244, 114, 182, 0.4) 0%, transparent 40%), radial-gradient(circle at 75% 75%, rgba(251, 113, 133, 0.4) 0%, transparent 40%)',
    },
  ];

  const generatePresentation = async () => {
    if (!title.trim()) {
      toast({
        title: 'Missing topic',
        description: 'Please enter a topic for your presentation.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-nycologic-presentation', {
        body: {
          topic: title,
          subject,
          description,
          duration,
          includeQuestions,
          questionCount: parseInt(questionCount),
          style,
          standard: topic?.standard,
        },
      });

      if (error) throw error;

      if (data.presentation) {
        setPresentation(data.presentation);
        toast({
          title: 'Presentation generated!',
          description: `Created ${data.presentation.slides.length} beautiful slides.`,
        });
      }
    } catch (error) {
      console.error('Error generating presentation:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate presentation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePresentation = async () => {
    if (!presentation || !user) {
      toast({
        title: 'Cannot save',
        description: 'Please log in to save presentations.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('nycologic_presentations').insert([{
        teacher_id: user.id,
        title: presentation.title,
        subtitle: presentation.subtitle || '',
        topic: presentation.topic,
        slides: presentation.slides as any,
      }]);

      if (error) throw error;

      toast({
        title: 'Presentation saved!',
        description: 'You can find it in your presentation library.',
      });
    } catch (error) {
      console.error('Error saving presentation:', error);
      toast({
        title: 'Failed to save',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePresentationSave = (updatedPresentation: NycologicPresentation) => {
    setPresentation(updatedPresentation);
    toast({
      title: 'Changes saved',
      description: 'Your edits have been applied to the presentation.',
    });
  };

  if (showPresentation && presentation) {
    return (
      <NycologicPresents
        presentation={presentation}
        onClose={() => setShowPresentation(false)}
        onSave={handlePresentationSave}
        isEditable={true}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={nyclogicLogo} alt="NYClogic" className="h-6 w-6" />
            NYClogic PRESENTS: Create Presentation
          </DialogTitle>
          <DialogDescription>
            Generate a stunning, interactive presentation that's more engaging than PowerPoint.
            Teachers can edit all text and customize the content.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Generation Form */}
            {!presentation && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Presentation Topic *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Solving Quadratic Equations"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Algebra">Algebra</SelectItem>
                        <SelectItem value="Geometry">Geometry</SelectItem>
                        <SelectItem value="Statistics">Statistics</SelectItem>
                        <SelectItem value="Calculus">Calculus</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Financial Literacy">Financial Literacy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Additional Details (optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Any specific topics, examples, or focus areas you want to include..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Presentation Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 minutes">15 minutes (5-7 slides)</SelectItem>
                        <SelectItem value="30 minutes">30 minutes (8-12 slides)</SelectItem>
                        <SelectItem value="45 minutes">45 minutes (12-16 slides)</SelectItem>
                        <SelectItem value="60 minutes">60 minutes (16-20 slides)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="style">Presentation Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engaging">Engaging & Interactive</SelectItem>
                        <SelectItem value="formal">Formal & Academic</SelectItem>
                        <SelectItem value="story">Story-based Learning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {topic?.standard && (
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        Standard: {topic.standard}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual Theme Selection */}
            {!presentation && (
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Choose Your Visual Theme
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {visualThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setVisualTheme(theme.id)}
                      className={`relative group overflow-hidden rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] ${
                        visualTheme === theme.id
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:ring-1 hover:ring-primary/50'
                      }`}
                    >
                      {/* Gradient background */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-90`}
                        style={{ backgroundImage: theme.pattern }}
                      />
                      
                      {/* Animated particles */}
                      <div className="absolute inset-0 overflow-hidden">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-white/30 animate-pulse"
                            style={{
                              left: `${20 + i * 30}%`,
                              top: `${30 + i * 20}%`,
                              animationDelay: `${i * 0.3}s`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Content */}
                      <div className="relative z-10">
                        <span className="text-2xl mb-2 block">{theme.emoji}</span>
                        <h4 className="font-bold text-white text-sm drop-shadow-md">
                          {theme.name}
                        </h4>
                        <p className="text-white/80 text-xs mt-1 drop-shadow">
                          {theme.description}
                        </p>
                      </div>

                      {/* Selected checkmark */}
                      {visualTheme === theme.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q&A Options */}
            {!presentation && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeQuestions"
                    checked={includeQuestions}
                    onChange={(e) => setIncludeQuestions(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="includeQuestions" className="text-sm cursor-pointer">
                    Include Q&A slides
                  </Label>
                </div>
                {includeQuestions && (
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Preview section */}
            {presentation && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{presentation.title}</h3>
                    <p className="text-sm text-muted-foreground">{presentation.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPresentation(null)}
                    >
                      Start Over
                    </Button>
                    <Button
                      variant="outline"
                      onClick={savePresentation}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button onClick={() => setShowPresentation(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Present
                    </Button>
                  </div>
                </div>

                {/* Slide preview grid */}
                <div className="grid grid-cols-3 gap-4">
                  {presentation.slides.map((slide, index) => (
                    <Card 
                      key={slide.id} 
                      className="cursor-pointer hover:ring-2 ring-primary transition-all overflow-hidden"
                      onClick={() => setShowPresentation(true)}
                    >
                      <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex flex-col items-center justify-center text-center">
                        <Badge variant="outline" className="text-white/50 border-white/20 text-[10px] mb-2">
                          {slide.type}
                        </Badge>
                        <p className="text-white text-sm font-medium line-clamp-2">
                          {slide.title.replace(/\*\*/g, '')}
                        </p>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs text-muted-foreground text-center">
                          Slide {index + 1}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        {!presentation && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={generatePresentation}
              disabled={isGenerating || !title.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Presentation
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
