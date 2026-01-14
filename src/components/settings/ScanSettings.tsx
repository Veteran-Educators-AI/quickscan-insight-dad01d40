import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { QrCode, Zap, Fingerprint, TrendingUp } from 'lucide-react';
import { useQRScanSettings } from '@/hooks/useQRScanSettings';
import { toast } from 'sonner';

export function ScanSettings() {
  const { settings, isLoading, updateSettings } = useQRScanSettings();

  const handleToggleQRScan = async (enabled: boolean) => {
    const success = await updateSettings({ autoQRScanEnabled: enabled });
    if (success) {
      toast.success(enabled ? 'Automatic QR scanning enabled' : 'Automatic QR scanning disabled');
    } else {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleHandwritingGrouping = async (enabled: boolean) => {
    const success = await updateSettings({ autoHandwritingGroupingEnabled: enabled });
    if (success) {
      toast.success(enabled ? 'Automatic handwriting grouping enabled' : 'Automatic handwriting grouping disabled');
    } else {
      toast.error('Failed to update settings');
    }
  };

  const handleGradeCurveChange = async (value: number[]) => {
    const success = await updateSettings({ gradeCurvePercent: value[0] });
    if (!success) {
      toast.error('Failed to update grade curve');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Scan Settings
        </CardTitle>
        <CardDescription>
          Configure scanning behavior for faster workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Scan Setting */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <QrCode className="h-4 w-4 text-primary" />
            </div>
            <div>
              <Label htmlFor="auto-qr-scan" className="font-medium">
                Automatic QR Code Scanning
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically detect QR codes on scanned papers to identify students
              </p>
            </div>
          </div>
          <Switch
            id="auto-qr-scan"
            checked={settings.autoQRScanEnabled}
            onCheckedChange={handleToggleQRScan}
            disabled={isLoading}
          />
        </div>

        {!settings.autoQRScanEnabled && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Faster workflow:</span> Images will go directly to analysis without QR detection. You can still manually select students.
            </p>
          </div>
        )}

        {/* Auto Handwriting Grouping Setting */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Fingerprint className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <Label htmlFor="auto-handwriting-grouping" className="font-medium">
                Auto-Group Multi-Page Papers
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically detect and link sequential pages with similar handwriting when importing from scanner
              </p>
            </div>
          </div>
          <Switch
            id="auto-handwriting-grouping"
            checked={settings.autoHandwritingGroupingEnabled}
            onCheckedChange={handleToggleHandwritingGrouping}
            disabled={isLoading}
          />
        </div>

        {settings.autoHandwritingGroupingEnabled && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm">
            <Fingerprint className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Smart grouping:</span> Sequential pages with matching handwriting will be automatically linked as one multi-page paper.
            </p>
          </div>
        )}

        {/* Grade Curve Setting */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <Label htmlFor="grade-curve" className="font-medium">
                Grade Curve Adjustment
              </Label>
              <p className="text-xs text-muted-foreground">
                Apply a curve to AI-analyzed grades (0-50% increase)
              </p>
            </div>
            <span className="text-lg font-semibold text-green-600 tabular-nums min-w-[3ch] text-right">
              +{settings.gradeCurvePercent}%
            </span>
          </div>
          <div className="px-1">
            <Slider
              id="grade-curve"
              value={[settings.gradeCurvePercent]}
              onValueChange={handleGradeCurveChange}
              max={50}
              min={0}
              step={5}
              disabled={isLoading}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>No curve</span>
              <span>+25%</span>
              <span>+50%</span>
            </div>
          </div>
        </div>

        {settings.gradeCurvePercent > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-sm">
            <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Curve active:</span> All analyzed grades will be increased by {settings.gradeCurvePercent}% (capped at 100%).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
