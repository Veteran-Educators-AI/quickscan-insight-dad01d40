import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Webhook, TestTube, CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

export function IntegrationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [sisterAppSyncEnabled, setSisterAppSyncEnabled] = useState(false);
  const [xpMultiplier, setXpMultiplier] = useState(0.5);
  const [coinMultiplier, setCoinMultiplier] = useState(0.25);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('integration_webhook_url, integration_webhook_enabled, sister_app_sync_enabled, sister_app_xp_multiplier, sister_app_coin_multiplier')
        .eq('teacher_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setWebhookUrl(data.integration_webhook_url || "");
        setWebhookEnabled(data.integration_webhook_enabled || false);
        setSisterAppSyncEnabled(data.sister_app_sync_enabled || false);
        setXpMultiplier(data.sister_app_xp_multiplier || 0.5);
        setCoinMultiplier(data.sister_app_coin_multiplier || 0.25);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
          integration_webhook_url: webhookUrl,
          integration_webhook_enabled: webhookEnabled,
          sister_app_sync_enabled: sisterAppSyncEnabled,
          sister_app_xp_multiplier: xpMultiplier,
          sister_app_coin_multiplier: coinMultiplier,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'teacher_id'
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your integration settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "No webhook URL",
        description: "Please enter a webhook URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          event_type: 'test',
          timestamp: new Date().toISOString(),
          source: 'scan-genius',
          message: 'This is a test webhook from ScanGenius',
          student: {
            id: 'test-student-id',
            name: 'Test Student',
            class_id: 'test-class-id',
            class_name: 'Test Class',
          },
          data: {
            sample_score: 85,
            sample_topic: 'Algebra',
            sample_level: 'B',
          },
        }),
      });

      setTestResult('success');
      toast({
        title: "Test sent",
        description: "Check your Zapier/n8n history to confirm receipt.",
      });
    } catch (error) {
      console.error('Webhook test error:', error);
      setTestResult('error');
      toast({
        title: "Test failed",
        description: "Could not send test webhook. Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
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
          <Webhook className="h-5 w-5" />
          Sister App Integration
        </CardTitle>
        <CardDescription>
          Automatically push student data to your sister app via Zapier or n8n webhook when scans are analyzed or diagnostic results are saved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>Setup:</strong> Create a Zap in Zapier or workflow in n8n with a "Webhooks by Zapier" or "Webhook" trigger, then paste the webhook URL below.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="webhook-enabled">Enable Integration</Label>
            <p className="text-sm text-muted-foreground">
              Push data automatically when student work is analyzed
            </p>
          </div>
          <Switch
            id="webhook-enabled"
            checked={webhookEnabled}
            onCheckedChange={setWebhookEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Your Zapier or n8n webhook URL
          </p>
        </div>

        {testResult && (
          <Alert variant={testResult === 'success' ? 'default' : 'destructive'}>
            {testResult === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {testResult === 'success'
                ? "Test webhook sent! Check your Zapier/n8n task history to confirm it was received."
                : "Failed to send test webhook. Please verify the URL is correct."}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={testWebhook}
            disabled={isTesting || !webhookUrl}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Test Webhook
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Settings
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Data Sent to Webhook</h4>
          <p className="text-sm text-muted-foreground mb-2">
            When triggered, the webhook receives:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li><strong>Scan Analysis:</strong> Student name, scores, topic performance, misconceptions, recommended level</li>
            <li><strong>Diagnostic Results:</strong> Student name, level scores (A-F), recommended advancement level</li>
          </ul>
        </div>

        <Separator className="my-6" />

        {/* Sister App Sync Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Connected Apps Sync</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically sync student grades and data with connected sister apps (like gamification or rewards apps).
          </p>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sister-sync-enabled">Enable Sister App Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically push grades when scans are analyzed
              </p>
            </div>
            <Switch
              id="sister-sync-enabled"
              checked={sisterAppSyncEnabled}
              onCheckedChange={setSisterAppSyncEnabled}
            />
          </div>

          {sisterAppSyncEnabled && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>XP Reward Multiplier</Label>
                  <span className="text-sm font-medium">{Math.round(xpMultiplier * 100)}% of grade</span>
                </div>
                <Slider
                  value={[xpMultiplier]}
                  onValueChange={([value]) => setXpMultiplier(value)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  A grade of 80 with 50% multiplier = {Math.round(80 * 0.5)} XP
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Coin Reward Multiplier</Label>
                  <span className="text-sm font-medium">{Math.round(coinMultiplier * 100)}% of grade</span>
                </div>
                <Slider
                  value={[coinMultiplier]}
                  onValueChange={([value]) => setCoinMultiplier(value)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  A grade of 80 with 25% multiplier = {Math.round(80 * 0.25)} coins
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
