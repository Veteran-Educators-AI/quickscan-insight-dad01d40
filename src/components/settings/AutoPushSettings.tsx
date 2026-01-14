import { useState, useEffect } from 'react';
import { Send, Loader2, Settings2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAutoPushSettings } from '@/hooks/useAutoPushSettings';

export function AutoPushSettings() {
  const {
    autoPushEnabled,
    autoPushThreshold,
    autoPushRegentsThreshold,
    autoPushWorksheetCount,
    isLoading,
    updateSettings,
  } = useAutoPushSettings();

  const [enabled, setEnabled] = useState(autoPushEnabled);
  const [threshold, setThreshold] = useState(autoPushThreshold);
  const [regentsThreshold, setRegentsThreshold] = useState(autoPushRegentsThreshold);
  const [worksheetCount, setWorksheetCount] = useState(autoPushWorksheetCount);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state when settings load
  useEffect(() => {
    setEnabled(autoPushEnabled);
    setThreshold(autoPushThreshold);
    setRegentsThreshold(autoPushRegentsThreshold);
    setWorksheetCount(autoPushWorksheetCount);
  }, [autoPushEnabled, autoPushThreshold, autoPushRegentsThreshold, autoPushWorksheetCount]);

  // Track changes
  useEffect(() => {
    const changed = 
      enabled !== autoPushEnabled ||
      threshold !== autoPushThreshold ||
      regentsThreshold !== autoPushRegentsThreshold ||
      worksheetCount !== autoPushWorksheetCount;
    setHasChanges(changed);
  }, [enabled, threshold, regentsThreshold, worksheetCount, autoPushEnabled, autoPushThreshold, autoPushRegentsThreshold, autoPushWorksheetCount]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const success = await updateSettings({
      autoPushEnabled: enabled,
      autoPushThreshold: threshold,
      autoPushRegentsThreshold: regentsThreshold,
      autoPushWorksheetCount: worksheetCount,
    });

    if (success) {
      toast.success('Auto-push settings saved');
      setHasChanges(false);
    } else {
      toast.error('Failed to save settings');
    }
    
    setIsSaving(false);
  };

  const getGradeLabel = (grade: number) => {
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  const getRegentsLabel = (score: number) => {
    if (score >= 4) return 'Thorough';
    if (score >= 3) return 'Adequate';
    if (score >= 2) return 'Partial';
    if (score >= 1) return 'Limited';
    return 'None';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Auto-Push to Student App
        </CardTitle>
        <CardDescription>
          Automatically send remediation worksheets to the sister app when students score below your thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="auto-push-toggle" className="text-base font-medium cursor-pointer">
              Enable Auto-Push
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically push worksheets when students need remediation
            </p>
          </div>
          <Switch
            id="auto-push-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            {/* Grade Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Grade Threshold</Label>
                <Badge variant="secondary" className="text-sm">
                  Below {threshold}% ({getGradeLabel(threshold)})
                </Badge>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={([value]) => setThreshold(value)}
                min={40}
                max={90}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Push remediation when grade is below {threshold}%
              </p>
            </div>

            {/* Regents Threshold */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Regents Score Threshold</Label>
                <Badge variant="secondary" className="text-sm">
                  Below {regentsThreshold} ({getRegentsLabel(regentsThreshold)})
                </Badge>
              </div>
              <Slider
                value={[regentsThreshold]}
                onValueChange={([value]) => setRegentsThreshold(value)}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Push remediation when Regents score is below {regentsThreshold}
              </p>
            </div>

            {/* Worksheet Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Worksheets Per Push</Label>
                <Badge variant="secondary" className="text-sm">
                  {worksheetCount} worksheet{worksheetCount > 1 ? 's' : ''}
                </Badge>
              </div>
              <Slider
                value={[worksheetCount]}
                onValueChange={([value]) => setWorksheetCount(value)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Number of remediation worksheets to auto-push
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <div className="flex gap-3">
                <Send className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    How Auto-Push Works
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• After analyzing student work, grades are compared to your thresholds</li>
                    <li>• If below threshold, {worksheetCount} remediation worksheet{worksheetCount > 1 ? 's are' : ' is'} automatically sent</li>
                    <li>• Students earn XP and coins for completing practice in the app</li>
                    <li>• Requires sister app integration to be configured</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
