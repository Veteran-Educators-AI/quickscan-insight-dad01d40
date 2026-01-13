import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Play, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { NycologicPresents, NycologicPresentation, PresentationSlide } from './NycologicPresents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
            <Sparkles className="h-5 w-5 text-primary" />
            Nycologic Presents: Create Presentation
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

                  <div className="flex items-center gap-4">
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
