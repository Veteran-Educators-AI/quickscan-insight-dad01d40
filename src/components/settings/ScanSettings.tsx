import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { QrCode, Zap } from 'lucide-react';
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
      </CardContent>
    </Card>
  );
}
