import { useState, useEffect } from 'react';
import { Bot, ShieldAlert, Loader2, Save, Mail, MessageSquare, GraduationCap, Brain, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface AIDetectionSettingsData {
  ai_detection_enabled: boolean;
  ai_detection_threshold: number;
  ai_auto_reject_enabled: boolean;
  parent_ai_notifications: boolean;
  level_drop_notifications: boolean;
  level_a_notifications: boolean;
  ai_feedback_verbosity: 'concise' | 'detailed';
  ai_training_mode: 'off' | 'learning' | 'trained';
  analysis_provider: 'gemini' | 'gpt4o' | 'gpt4o-mini';
}

export function AIDetectionSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [settings, setSettings] = useState<AIDetectionSettingsData>({
    ai_detection_enabled: true,
    ai_detection_threshold: 80,
    ai_auto_reject_enabled: true,
    parent_ai_notifications: true,
    level_drop_notifications: true,
    level_a_notifications: true,
    ai_feedback_verbosity: 'concise',
    ai_training_mode: 'learning',
    analysis_provider: 'gemini',
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const [settingsResult, correctionsResult] = await Promise.all([
        supabase
          .from('settings')
          .select('ai_detection_enabled, ai_detection_threshold, ai_auto_reject_enabled, parent_ai_notifications, level_drop_notifications, level_a_notifications, ai_feedback_verbosity, ai_training_mode, analysis_provider')
          .eq('teacher_id', user!.id)
          .maybeSingle(),
        supabase
          .from('grading_corrections')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user!.id)
      ]);

      if (settingsResult.error) throw settingsResult.error;

      if (settingsResult.data) {
        setSettings({
          ai_detection_enabled: settingsResult.data.ai_detection_enabled ?? true,
          ai_detection_threshold: settingsResult.data.ai_detection_threshold ?? 80,
          ai_auto_reject_enabled: settingsResult.data.ai_auto_reject_enabled ?? true,
          parent_ai_notifications: settingsResult.data.parent_ai_notifications ?? true,
          level_drop_notifications: settingsResult.data.level_drop_notifications ?? true,
          level_a_notifications: settingsResult.data.level_a_notifications ?? true,
          ai_feedback_verbosity: (settingsResult.data.ai_feedback_verbosity as 'concise' | 'detailed') ?? 'concise',
          ai_training_mode: (settingsResult.data.ai_training_mode as 'off' | 'learning' | 'trained') ?? 'learning',
          analysis_provider: (settingsResult.data.analysis_provider as 'gemini' | 'gpt4o' | 'gpt4o-mini') ?? 'gemini',
        });
      }

      setCorrectionCount(correctionsResult.count || 0);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          ai_detection_enabled: settings.ai_detection_enabled,
          ai_detection_threshold: settings.ai_detection_threshold,
          ai_auto_reject_enabled: settings.ai_auto_reject_enabled,
          parent_ai_notifications: settings.parent_ai_notifications,
          level_drop_notifications: settings.level_drop_notifications,
          level_a_notifications: settings.level_a_notifications,
          ai_feedback_verbosity: settings.ai_feedback_verbosity,
          ai_training_mode: settings.ai_training_mode,
          analysis_provider: settings.analysis_provider,
        }, { onConflict: 'teacher_id' });

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getTrainingProgress = () => {
    // 50 corrections = fully trained
    const targetCorrections = 50;
    return Math.min(100, (correctionCount / targetCorrections) * 100);
  };

  const getTrainingStatusBadge = () => {
    if (settings.ai_training_mode === 'off') {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (settings.ai_training_mode === 'trained' || correctionCount >= 50) {
      return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Trained</Badge>;
    }
    return <Badge variant="outline" className="border-amber-500 text-amber-600"><Brain className="h-3 w-3 mr-1" /> Learning ({correctionCount}/50)</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Detection Settings
        </CardTitle>
        <CardDescription>
          Configure how AI-generated work is detected and handled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Training Mode Section */}
        <div className="space-y-3 p-4 rounded-lg border bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              <Label className="text-base font-semibold">AI Grading Training</Label>
            </div>
            {getTrainingStatusBadge()}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Train the AI to grade in your style. When you correct AI grades, the system learns your preferences.
          </p>

          <Select
            value={settings.ai_training_mode}
            onValueChange={(value: 'off' | 'learning' | 'trained') => 
              setSettings(prev => ({ ...prev, ai_training_mode: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Off</span>
                  <span className="text-xs text-muted-foreground">Use standard grading only</span>
                </div>
              </SelectItem>
              <SelectItem value="learning">
                <div className="flex flex-col items-start">
                  <span className="font-medium flex items-center gap-1">
                    <Brain className="h-3 w-3" /> Learning Mode
                  </span>
                  <span className="text-xs text-muted-foreground">AI learns from your corrections</span>
                </div>
              </SelectItem>
              <SelectItem value="trained">
                <div className="flex flex-col items-start">
                  <span className="font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Trained Mode
                  </span>
                  <span className="text-xs text-muted-foreground">AI applies your grading style</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {settings.ai_training_mode !== 'off' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Training Progress</span>
                <span className="font-medium">{correctionCount} corrections</span>
              </div>
              <Progress value={getTrainingProgress()} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {correctionCount < 10 
                  ? "Start correcting AI grades to train the system on your preferences."
                  : correctionCount < 30 
                  ? "Good progress! Keep correcting grades to improve accuracy."
                  : correctionCount < 50 
                  ? "Almost there! A few more corrections will optimize the AI."
                  : "Fully trained! The AI now grades in your style."}
              </p>
            </div>
          )}
        </div>

        {/* AI Feedback Verbosity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <Label>AI Grading Feedback Style</Label>
          </div>
          <Select
            value={settings.ai_feedback_verbosity}
            onValueChange={(value: 'concise' | 'detailed') => 
              setSettings(prev => ({ ...prev, ai_feedback_verbosity: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concise">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Concise</span>
                  <span className="text-xs text-muted-foreground">Brief feedback, under 75 words</span>
                </div>
              </SelectItem>
              <SelectItem value="detailed">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Detailed</span>
                  <span className="text-xs text-muted-foreground">Extended explanations with full context</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Controls how verbose AI grading justifications and feedback are
          </p>
        </div>

        {/* AI Analysis Model Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label>AI Analysis Model</Label>
          </div>
          <Select
            value={settings.analysis_provider}
            onValueChange={(value: 'gemini' | 'gpt4o' | 'gpt4o-mini') => 
              setSettings(prev => ({ ...prev, analysis_provider: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Gemini 2.5 Flash</span>
                  <span className="text-xs text-muted-foreground">Fast &amp; affordable — good for most work (~$0.01/scan)</span>
                </div>
              </SelectItem>
              <SelectItem value="gpt4o-mini">
                <div className="flex flex-col items-start">
                  <span className="font-medium">GPT-4o Mini</span>
                  <span className="text-xs text-muted-foreground">Better handwriting reading, similar cost (~$0.02/scan)</span>
                </div>
              </SelectItem>
              <SelectItem value="gpt4o">
                <div className="flex flex-col items-start">
                  <span className="font-medium">GPT-4o</span>
                  <span className="text-xs text-muted-foreground">Best handwriting &amp; analysis quality (~$0.08/scan)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings.analysis_provider === 'gpt4o' 
              ? 'GPT-4o provides the best handwriting recognition and most detailed educational analysis. Recommended for difficult-to-read student work.'
              : settings.analysis_provider === 'gpt4o-mini'
              ? 'GPT-4o Mini offers improved handwriting reading over Gemini at a similar cost. Good balance of quality and affordability.'
              : 'Gemini Flash is fast and affordable. Works well for clearly written student work.'}
          </p>
        </div>

        {/* AI Detection Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-detection">Enable AI Detection</Label>
            <p className="text-sm text-muted-foreground">
              Analyze student work for AI-generated content
            </p>
          </div>
          <Switch
            id="ai-detection"
            checked={settings.ai_detection_enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, ai_detection_enabled: checked }))
            }
          />
        </div>

        {/* Threshold Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Detection Threshold</Label>
            <span className="text-sm font-medium text-primary">{settings.ai_detection_threshold}%</span>
          </div>
          <Slider
            value={[settings.ai_detection_threshold]}
            onValueChange={([value]) => 
              setSettings(prev => ({ ...prev, ai_detection_threshold: value }))
            }
            min={50}
            max={95}
            step={5}
            disabled={!settings.ai_detection_enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Work with AI confidence above this threshold will be flagged
            {settings.ai_auto_reject_enabled && ' and automatically rejected'}
          </p>
        </div>

        {/* Auto-Reject Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-reject" className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Auto-Reject AI Work
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically reject submissions above the threshold
            </p>
          </div>
          <Switch
            id="auto-reject"
            checked={settings.ai_auto_reject_enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, ai_auto_reject_enabled: checked }))
            }
            disabled={!settings.ai_detection_enabled}
          />
        </div>

        {/* Parent AI Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="parent-ai-notify" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Parent AI Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Email parents when student work is flagged for AI content
            </p>
          </div>
          <Switch
            id="parent-ai-notify"
            checked={settings.parent_ai_notifications}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, parent_ai_notifications: checked }))
            }
            disabled={!settings.ai_detection_enabled}
          />
        </div>

        {/* Divider */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-4">Email Notifications</h4>

          {/* Level Drop Notifications */}
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <Label htmlFor="level-drop">Level Drop Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Email when a student's advancement level drops
              </p>
            </div>
            <Switch
              id="level-drop"
              checked={settings.level_drop_notifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, level_drop_notifications: checked }))
              }
            />
          </div>

          {/* Level A Achievement Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="level-a">Level A Mastery Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Email when a student achieves Level A mastery
              </p>
            </div>
            <Switch
              id="level-a"
              checked={settings.level_a_notifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, level_a_notifications: checked }))
              }
            />
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
