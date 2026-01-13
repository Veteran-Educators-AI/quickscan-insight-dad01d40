import { useState, useEffect } from 'react';
import { AlertTriangle, Mail, Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

function getScoreLabel(score: number): string {
  if (score >= 4) return "Thorough Understanding";
  if (score >= 3) return "Complete and Correct";
  if (score >= 2) return "Partial Understanding";
  if (score >= 1) return "Minimal Understanding";
  return "No Understanding";
}

function getScoreColor(score: number): string {
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-emerald-500";
  if (score >= 2) return "bg-yellow-500";
  if (score >= 1) return "bg-orange-500";
  return "bg-red-500";
}

export function LowRegentsAlertSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(true);
  const [parentAlertsEnabled, setParentAlertsEnabled] = useState(true);
  const [threshold, setThreshold] = useState(2);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('low_regents_alerts_enabled, low_regents_threshold, low_regents_parent_alerts_enabled')
          .eq('teacher_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading alert settings:', error);
        }

        if (data) {
          setIsEnabled(data.low_regents_alerts_enabled ?? true);
          setThreshold(data.low_regents_threshold ?? 2);
          setParentAlertsEnabled(data.low_regents_parent_alerts_enabled ?? true);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          low_regents_alerts_enabled: isEnabled,
          low_regents_threshold: threshold,
          low_regents_parent_alerts_enabled: parentAlertsEnabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id'
        });

      if (error) throw error;
      toast.success('Alert settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Low Regents Score Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Regents Score Alerts
        </CardTitle>
        <CardDescription>
          Receive email alerts when a student's Regents score falls below your threshold.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="low-regents-alerts" className="text-base font-medium">
              Teacher Email Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when a student scores below the threshold
            </p>
          </div>
          <Switch
            id="low-regents-alerts"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {/* Parent Alerts Toggle */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="space-y-0.5">
            <Label htmlFor="parent-alerts" className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Parent Email Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Also notify parents when their child scores below threshold
            </p>
          </div>
          <Switch
            id="parent-alerts"
            checked={parentAlertsEnabled}
            onCheckedChange={setParentAlertsEnabled}
            disabled={!isEnabled}
          />
        </div>

        {isEnabled && (
          <>
            {/* Threshold Slider */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Alert Threshold</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{threshold}</span>
                  <span className="text-muted-foreground">/4</span>
                </div>
              </div>
              
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 (Minimal)</span>
                <span>2 (Partial)</span>
                <span>3 (Complete)</span>
                <span>4 (Thorough)</span>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">Alert Preview:</p>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((score) => (
                  <Badge
                    key={score}
                    variant={score < threshold ? "destructive" : "secondary"}
                    className="gap-1.5"
                  >
                    <div className={`w-2 h-2 rounded-full ${getScoreColor(score)}`} />
                    Score {score}
                    {score < threshold ? (
                      <Mail className="h-3 w-3 ml-1" />
                    ) : null}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {parentAlertsEnabled ? (
                  <>You and parents will receive email alerts for scores below <strong>{threshold}</strong></>
                ) : (
                  <>You'll receive an email alert for scores below <strong>{threshold}</strong></>
                )} ({getScoreLabel(threshold - 1)} or lower)
              </p>
            </div>

            {/* Parent Alert Info */}
            {parentAlertsEnabled && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4 space-y-2">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Parent Notifications
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Parents will receive a friendly email with academic progress information and suggestions for how to support their child at home. Emails are only sent to students with a parent email address on file.
                </p>
              </div>
            )}
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Alert Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}