import { useState, useEffect } from 'react';
import { Bot, ShieldAlert, Loader2, Save, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
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
}

export function AIDetectionSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AIDetectionSettingsData>({
    ai_detection_enabled: true,
    ai_detection_threshold: 80,
    ai_auto_reject_enabled: true,
    parent_ai_notifications: true,
    level_drop_notifications: true,
    level_a_notifications: true,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('ai_detection_enabled, ai_detection_threshold, ai_auto_reject_enabled, parent_ai_notifications, level_drop_notifications, level_a_notifications')
        .eq('teacher_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ai_detection_enabled: data.ai_detection_enabled ?? true,
          ai_detection_threshold: data.ai_detection_threshold ?? 80,
          ai_auto_reject_enabled: data.ai_auto_reject_enabled ?? true,
          parent_ai_notifications: data.parent_ai_notifications ?? true,
          level_drop_notifications: data.level_drop_notifications ?? true,
          level_a_notifications: data.level_a_notifications ?? true,
        });
      }
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
