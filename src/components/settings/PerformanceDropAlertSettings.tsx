import { useState, useEffect } from 'react';
import { TrendingDown, Mail, Save, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export function PerformanceDropAlertSettings() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [parentAlertsEnabled, setParentAlertsEnabled] = useState(true);
  const [includeRemediation, setIncludeRemediation] = useState(true);
  const [threshold, setThreshold] = useState(15);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('teacher_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading alert settings:', error);
        }

        if (data) {
          // Use existing fields or defaults
          setIsEnabled((data as any).performance_drop_alerts_enabled ?? false);
          setThreshold((data as any).performance_drop_threshold ?? 15);
          setParentAlertsEnabled((data as any).performance_drop_parent_alerts ?? true);
          setIncludeRemediation((data as any).performance_drop_include_remediation ?? true);
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
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'teacher_id'
        });

      if (error) throw error;
      
      // Store in localStorage as a fallback since we don't have the columns yet
      localStorage.setItem(`performance_drop_settings_${user.id}`, JSON.stringify({
        enabled: isEnabled,
        threshold,
        parentAlerts: parentAlertsEnabled,
        includeRemediation,
      }));
      
      toast.success('Performance drop alert settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`performance_drop_settings_${user.id}`);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        setIsEnabled(settings.enabled ?? false);
        setThreshold(settings.threshold ?? 15);
        setParentAlertsEnabled(settings.parentAlerts ?? true);
        setIncludeRemediation(settings.includeRemediation ?? true);
      } catch (e) {
        // Ignore parse errors
      }
    }
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Performance Drop Alerts
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
          <TrendingDown className="h-5 w-5 text-red-500" />
          Performance Drop Alerts
        </CardTitle>
        <CardDescription>
          Receive email alerts when a student's grade drops significantly between assessments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="performance-drop-alerts" className="text-base font-medium">
              Enable Alerts
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when a student's grade drops by the threshold amount
            </p>
          </div>
          <Switch
            id="performance-drop-alerts"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {isEnabled && (
          <>
            {/* Threshold Slider */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Drop Threshold</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-600">-{threshold}%</span>
                </div>
              </div>
              
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={5}
                max={30}
                step={5}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5% (Sensitive)</span>
                <span>15% (Standard)</span>
                <span>30% (Major drops only)</span>
              </div>
            </div>

            {/* Parent Alerts Toggle */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="parent-drop-alerts" className="text-base font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Parent Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Also notify parents when their child's performance drops
                </p>
              </div>
              <Switch
                id="parent-drop-alerts"
                checked={parentAlertsEnabled}
                onCheckedChange={setParentAlertsEnabled}
              />
            </div>

            {/* Include Remediation Toggle */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="include-remediation" className="text-base font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Include Remediation Suggestions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Include practice topic recommendations in parent emails
                </p>
              </div>
              <Switch
                id="include-remediation"
                checked={includeRemediation}
                onCheckedChange={setIncludeRemediation}
                disabled={!parentAlertsEnabled}
              />
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">Alert Preview:</p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20, 25].map((drop) => (
                  <Badge
                    key={drop}
                    variant={drop >= threshold ? "destructive" : "secondary"}
                    className="gap-1.5"
                  >
                    -{drop}%
                    {drop >= threshold ? (
                      <Mail className="h-3 w-3 ml-1" />
                    ) : null}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {parentAlertsEnabled ? (
                  <>You and parents will be notified when a student drops <strong>{threshold}%</strong> or more</>
                ) : (
                  <>You'll be notified when a student drops <strong>{threshold}%</strong> or more</>
                )}
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
                  Parents will receive a friendly email with academic progress information
                  {includeRemediation && " and suggested practice topics"}.
                  Emails are only sent to students with a parent email address on file.
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
