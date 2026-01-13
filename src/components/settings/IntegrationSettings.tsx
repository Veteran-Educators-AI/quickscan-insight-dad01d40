/**
 * ============================================================================
 * INTEGRATION SETTINGS COMPONENT
 * ============================================================================
 * 
 * This component manages two key integration features:
 * 
 * 1. WEBHOOK INTEGRATION (Zapier/n8n)
 *    - Allows teachers to configure an external webhook URL
 *    - When enabled, student data is automatically sent to the webhook
 *    - Supports testing the webhook connection before going live
 *    - Use case: Connect to Zapier or n8n to trigger workflows (email parents,
 *      update Google Sheets, send Slack notifications, etc.)
 * 
 * 2. SISTER APP SYNC
 *    - Enables automatic synchronization with connected gamification apps
 *    - Converts student grades to XP and coin rewards using configurable multipliers
 *    - Example: A grade of 80 with 50% XP multiplier = 40 XP reward
 *    - Use case: Reward students in a gaming/rewards app based on their academic performance
 * 
 * ============================================================================
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Webhook, TestTube, CheckCircle2, AlertCircle, Link2, Cloud, Folder, RefreshCw, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleDriveAutoSyncConfig } from "@/components/scan/GoogleDriveAutoSyncConfig";

export function IntegrationSettings() {
  // ============================================================================
  // AUTHENTICATION & UTILITIES
  // ============================================================================
  // Get the current logged-in user from auth context
  const { user } = useAuth();
  // Toast hook for showing success/error notifications
  const { toast } = useToast();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // --- Loading & Saving States ---
  // Tracks if we're currently loading settings from the database
  const [isLoading, setIsLoading] = useState(true);
  // Tracks if we're currently saving settings to the database
  const [isSaving, setIsSaving] = useState(false);
  // Tracks if we're currently testing the webhook connection
  const [isTesting, setIsTesting] = useState(false);

  // --- Webhook Configuration ---
  // The external webhook URL (e.g., Zapier or n8n webhook endpoint)
  // Format: "https://hooks.zapier.com/hooks/catch/..." or similar
  const [webhookUrl, setWebhookUrl] = useState("");
  // Master toggle for webhook integration - when false, no data is sent
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  // --- Sister App Sync Configuration ---
  // Master toggle for sister app sync - when false, grades aren't pushed to sister apps
  const [sisterAppSyncEnabled, setSisterAppSyncEnabled] = useState(false);
  // Multiplier for converting grades to XP rewards (0.1 to 1.0)
  // Example: 0.5 means a grade of 80 gives 40 XP
  const [xpMultiplier, setXpMultiplier] = useState(0.5);
  // Multiplier for converting grades to coin rewards (0.1 to 1.0)
  // Example: 0.25 means a grade of 80 gives 20 coins
  const [coinMultiplier, setCoinMultiplier] = useState(0.25);

  // --- Webhook Test Result ---
  // Stores the result of the last webhook test ('success' | 'error' | null)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // --- Google Drive Configuration ---
  const { connected: driveConnected, checkConnection: checkDriveConnection, loading: driveLoading } = useGoogleDrive();
  const [driveChecked, setDriveChecked] = useState(false);
  const [showAutoSyncConfig, setShowAutoSyncConfig] = useState(false);
  const [autoSyncFolder, setAutoSyncFolder] = useState<{ id: string; name: string; interval: number } | null>(null);

  // ============================================================================
  // LOAD SETTINGS ON COMPONENT MOUNT
  // ============================================================================
  // When the user is authenticated, load their saved settings from the database
  useEffect(() => {
    if (user) {
      loadSettings();
      // Check Google Drive connection status
      checkDriveConnection().then(() => setDriveChecked(true));
    }
  }, [user, checkDriveConnection]);

  // ============================================================================
  // LOAD SETTINGS FROM DATABASE
  // ============================================================================
  /**
   * Fetches the user's integration settings from the 'settings' table.
   * This includes webhook URL, enabled states, and multiplier values.
   * If no settings exist yet (PGRST116 error), we just use the defaults.
   */
  const loadSettings = async () => {
    try {
      // Query the settings table for this teacher's integration settings
      const { data, error } = await supabase
        .from('settings')
        .select('integration_webhook_url, integration_webhook_enabled, sister_app_sync_enabled, sister_app_xp_multiplier, sister_app_coin_multiplier')
        .eq('teacher_id', user!.id)
        .single();

      // PGRST116 means no row found - this is okay, teacher just hasn't saved settings yet
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If we found settings, update our state with the saved values
      if (data) {
        setWebhookUrl(data.integration_webhook_url || "");
        setWebhookEnabled(data.integration_webhook_enabled || false);
        setSisterAppSyncEnabled(data.sister_app_sync_enabled || false);
        // Use saved multipliers or fall back to defaults (0.5 for XP, 0.25 for coins)
        setXpMultiplier(data.sister_app_xp_multiplier || 0.5);
        setCoinMultiplier(data.sister_app_coin_multiplier || 0.25);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      // Mark loading as complete so we can show the form
      setIsLoading(false);
    }
  };

  // ============================================================================
  // SAVE SETTINGS TO DATABASE
  // ============================================================================
  /**
   * Saves all integration settings to the database using upsert.
   * Upsert means: insert if no row exists, update if one does.
   * The 'onConflict: teacher_id' ensures we only have one settings row per teacher.
   */
  const saveSettings = async () => {
    // Safety check - don't save if no user is logged in
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Upsert (insert or update) the settings row for this teacher
      const { error } = await supabase
        .from('settings')
        .upsert({
          teacher_id: user.id,
          // Webhook settings
          integration_webhook_url: webhookUrl,
          integration_webhook_enabled: webhookEnabled,
          // Sister app sync settings
          sister_app_sync_enabled: sisterAppSyncEnabled,
          sister_app_xp_multiplier: xpMultiplier,
          sister_app_coin_multiplier: coinMultiplier,
          // Update timestamp
          updated_at: new Date().toISOString(),
        }, {
          // If a row with this teacher_id exists, update it instead of inserting
          onConflict: 'teacher_id'
        });

      if (error) throw error;

      // Show success message
      toast({
        title: "Settings saved",
        description: "Your integration settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      // Show error message
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // TEST WEBHOOK CONNECTION
  // ============================================================================
  /**
   * Sends a test payload to the configured webhook URL.
   * This helps teachers verify their Zapier/n8n connection is working
   * before enabling it for real student data.
   * 
   * Note: Uses 'no-cors' mode because most webhook services don't return
   * proper CORS headers. This means we can't actually check the response,
   * so we just tell the user to check their Zapier/n8n task history.
   */
  const testWebhook = async () => {
    // Validate that a URL has been entered
    if (!webhookUrl) {
      toast({
        title: "No webhook URL",
        description: "Please enter a webhook URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null); // Clear any previous test result

    try {
      // Send a test payload to the webhook
      // This simulates what real data would look like
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // no-cors allows us to send to external domains without CORS issues
        // Trade-off: We can't read the response, so we can't know if it truly succeeded
        mode: 'no-cors',
        body: JSON.stringify({
          // Identify this as a test event
          event_type: 'test',
          timestamp: new Date().toISOString(),
          source: 'scan-genius',
          message: 'This is a test webhook from ScanGenius',
          // Sample student data so they can see the structure
          student: {
            id: 'test-student-id',
            name: 'Test Student',
            class_id: 'test-class-id',
            class_name: 'Test Class',
          },
          // Sample grade/analysis data
          data: {
            sample_score: 85,
            sample_topic: 'Algebra',
            sample_level: 'B',
          },
        }),
      });

      // If we got here without throwing, consider it a success
      // (we can't actually check response due to no-cors)
      setTestResult('success');
      toast({
        title: "Test sent",
        description: "Check your Zapier/n8n history to confirm receipt.",
      });
    } catch (error) {
      // Network error or invalid URL
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

  // ============================================================================
  // LOADING STATE UI
  // ============================================================================
  // Show a spinner while we're loading settings from the database
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // MAIN SETTINGS FORM UI
  // ============================================================================
  return (
    <Card>
      {/* --- Card Header --- */}
      {/* Displays the title and description for the integration settings section */}
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
        {/* ================================================================== */}
        {/* WEBHOOK CONFIGURATION SECTION */}
        {/* ================================================================== */}
        
        {/* --- Setup Instructions --- */}
        {/* Explains how to get a webhook URL from Zapier or n8n */}
        <Alert>
          <AlertDescription>
            <strong>Setup:</strong> Create a Zap in Zapier or workflow in n8n with a "Webhooks by Zapier" or "Webhook" trigger, then paste the webhook URL below.
          </AlertDescription>
        </Alert>

        {/* --- Enable/Disable Webhook Toggle --- */}
        {/* Master switch for the webhook integration */}
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

        {/* --- Webhook URL Input --- */}
        {/* Text field for entering the Zapier/n8n webhook URL */}
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

        {/* --- Webhook Test Result Display --- */}
        {/* Shows success/error message after testing the webhook */}
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

        {/* --- Action Buttons --- */}
        {/* Test Webhook button and Save Settings button */}
        <div className="flex gap-2">
          {/* Test button - sends a sample payload to verify the connection */}
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
          {/* Save button - persists all settings to the database */}
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Settings
          </Button>
        </div>

        {/* --- Data Documentation --- */}
        {/* Explains what data is sent when the webhook is triggered */}
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

        {/* Visual separator between webhook and sister app sections */}
        <Separator className="my-6" />

        {/* ================================================================== */}
        {/* SISTER APP SYNC SECTION */}
        {/* ================================================================== */}
        {/* This section controls automatic grade syncing to gamification/rewards apps */}
        <div className="space-y-6">
          {/* --- Section Header --- */}
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Connected Apps Sync</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically sync student grades and data with connected sister apps (like gamification or rewards apps).
          </p>

          {/* --- Enable/Disable Sister App Sync Toggle --- */}
          {/* Master switch for sister app synchronization */}
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

          {/* --- Reward Multiplier Configuration --- */}
          {/* Only shown when sister app sync is enabled */}
          {/* Allows teachers to configure how grades convert to XP and coins */}
          {sisterAppSyncEnabled && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              {/* --- XP Multiplier Slider --- */}
              {/* Controls what percentage of the grade becomes XP */}
              {/* Range: 10% to 100%, default 50% */}
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
                {/* Example calculation to help teachers understand the multiplier */}
                <p className="text-xs text-muted-foreground">
                  A grade of 80 with 50% multiplier = {Math.round(80 * 0.5)} XP
                </p>
              </div>

              {/* --- Coin Multiplier Slider --- */}
              {/* Controls what percentage of the grade becomes coins */}
              {/* Range: 10% to 100%, default 25% */}
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
                {/* Example calculation to help teachers understand the multiplier */}
                <p className="text-xs text-muted-foreground">
                  A grade of 80 with 25% multiplier = {Math.round(80 * 0.25)} coins
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Visual separator between sister app and google drive sections */}
        <Separator className="my-6" />

        {/* ================================================================== */}
        {/* GOOGLE DRIVE INTEGRATION SECTION */}
        {/* ================================================================== */}
        <div className="space-y-6">
          {/* --- Section Header --- */}
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Google Drive Integration</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Import scanned documents directly from Google Drive and set up auto-sync to automatically detect new files.
          </p>

          {/* --- Connection Status --- */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${driveConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                <Cloud className={`h-5 w-5 ${driveConnected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="font-medium text-sm">Google Drive</div>
                <div className="text-xs text-muted-foreground">
                  {!driveChecked ? 'Checking connection...' : driveConnected ? 'Connected via Google OAuth' : 'Not connected'}
                </div>
              </div>
            </div>
            {driveChecked && (
              <Badge variant={driveConnected ? 'default' : 'secondary'} className={driveConnected ? 'bg-green-600' : ''}>
                {driveConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            )}
          </div>

          {/* --- Connection Instructions --- */}
          {driveChecked && !driveConnected && (
            <Alert>
              <AlertDescription>
                <strong>To connect Google Drive:</strong> You need to sign in with Google when logging into the app. 
                Google Drive access is granted through your Google account login. Sign out and sign back in with Google to enable Drive integration.
              </AlertDescription>
            </Alert>
          )}

          {/* --- Auto-Sync Configuration --- */}
          {driveConnected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Scanner Auto-Sync Folder</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically import new scans from a Google Drive folder
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAutoSyncConfig(true)}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>

              {autoSyncFolder && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Folder className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{autoSyncFolder.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Checking every {autoSyncFolder.interval} seconds
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Auto-Sync
                  </Badge>
                </div>
              )}

              <Alert>
                <AlertDescription>
                  <strong>How it works:</strong> Configure your physical scanner to save files to a Google Drive folder. 
                  The app will automatically detect new images and add them to your scan queue in Scanner mode.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardContent>

      {/* Google Drive Auto-Sync Configuration Dialog */}
      <Dialog open={showAutoSyncConfig} onOpenChange={setShowAutoSyncConfig}>
        <DialogContent className="max-w-lg">
          <GoogleDriveAutoSyncConfig
            onFolderSelected={(folderId, folderName, intervalSeconds) => {
              setAutoSyncFolder({ id: folderId, name: folderName, interval: intervalSeconds });
              setShowAutoSyncConfig(false);
              toast({
                title: "Auto-sync configured",
                description: `Will check "${folderName}" for new scans every ${intervalSeconds} seconds.`,
              });
            }}
            onClose={() => setShowAutoSyncConfig(false)}
            currentFolderId={autoSyncFolder?.id}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
