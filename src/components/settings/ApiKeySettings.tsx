// =============================================================================
// API KEY SETTINGS COMPONENT
// =============================================================================
// This component allows teachers to generate and manage API keys that the
// sister app (NYClogic Scholar Ai) uses to send data back to NYCLogic Ai.
//
// KEY FEATURES:
// - Generate new API keys (shown only once for security)
// - View existing key status (active/inactive, last used)
// - Enable/disable keys without deleting them
// - Regenerate keys (invalidates old key)
// - Copy endpoint URL and key to clipboard
// - Display API documentation for sister app developers
// =============================================================================

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Key, Copy, RefreshCw, Eye, EyeOff, Shield, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------
// ApiKeyRecord: Shape of API key data stored in the database.
// Note: We never store or retrieve the actual key - only the hash and prefix.
// -----------------------------------------------------------------------------
interface ApiKeyRecord {
  id: string;                    // Unique identifier for this key record
  api_key_prefix: string;        // First 12 chars of key for display (e.g., "sg_live_abc...")
  name: string;                  // Human-readable name (e.g., "Sister App Key")
  created_at: string;            // When the key was created
  last_used_at: string | null;   // When the key was last used (null if never used)
  is_active: boolean;            // Whether the key is currently enabled
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
export function ApiKeySettings() {
  // Get current authenticated user from auth context
  const { user } = useAuth();
  
  // Toast notifications for user feedback
  const { toast } = useToast();
  
  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);       // Loading existing key data
  const [isGenerating, setIsGenerating] = useState(false); // Generating new key
  const [apiKey, setApiKey] = useState<ApiKeyRecord | null>(null); // Current key record
  const [newApiKey, setNewApiKey] = useState<string | null>(null); // Newly generated key (temporary)
  const [showKey, setShowKey] = useState(false);          // Toggle key visibility
  const [copied, setCopied] = useState(false);            // Copy button feedback

  // ---------------------------------------------------------------------------
  // LOAD API KEY ON MOUNT
  // ---------------------------------------------------------------------------
  // When component mounts or user changes, load existing API key from database.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (user) {
      loadApiKey();
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // LOAD API KEY FROM DATABASE
  // ---------------------------------------------------------------------------
  // Fetches the teacher's existing API key record (if any).
  // We use maybeSingle() because the key might not exist yet.
  // ---------------------------------------------------------------------------
  const loadApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_api_keys')
        .select('*')
        .eq('teacher_id', user!.id)
        .eq('name', 'Sister App Key')  // We only create one key with this name
        .maybeSingle();                 // Returns null instead of error if not found

      if (error) throw error;
      setApiKey(data);
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // GENERATE RANDOM API KEY
  // ---------------------------------------------------------------------------
  // Creates a new API key with format: nl_live_[32 random alphanumeric chars]
  // The "nl_live_" prefix helps identify this as a NYCLogic Ai production key.
  // ---------------------------------------------------------------------------
  const generateApiKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'nl_live_';
    let key = '';
    
    // Generate 32 random characters
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return prefix + key;
  };

  // ---------------------------------------------------------------------------
  // HASH API KEY FOR SECURE STORAGE
  // ---------------------------------------------------------------------------
  // We never store the actual API key in the database.
  // Instead, we store a SHA-256 hash of it.
  // When the sister app sends a request, we hash their key and compare hashes.
  // 
  // This means:
  // - If our database is compromised, attackers can't use the keys
  // - We can only validate keys, never retrieve them
  // - Teachers must copy the key immediately after generation
  // ---------------------------------------------------------------------------
  const hashApiKey = async (key: string): Promise<string> => {
    // Step 1: Convert string to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    
    // Step 2: Compute SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Step 3: Convert hash bytes to hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ---------------------------------------------------------------------------
  // CREATE OR REGENERATE API KEY
  // ---------------------------------------------------------------------------
  // Handles both first-time key creation and regeneration of existing keys.
  // 
  // For new keys: Creates a new record in teacher_api_keys
  // For existing keys: Updates the hash (invalidates old key)
  // ---------------------------------------------------------------------------
  const createOrRegenerateKey = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      // Generate new random key
      const newKey = generateApiKey();
      
      // Hash it for storage
      const keyHash = await hashApiKey(newKey);
      
      // Create a visible prefix for the UI (shows first 12 chars + "...")
      const keyPrefix = newKey.substring(0, 12) + '...';

      if (apiKey) {
        // -----------------------------------------------------------------------
        // UPDATE EXISTING KEY
        // -----------------------------------------------------------------------
        // This invalidates the old key - sister app must update to new key
        // -----------------------------------------------------------------------
        const { error } = await supabase
          .from('teacher_api_keys')
          .update({
            api_key_hash: keyHash,
            api_key_prefix: keyPrefix,
            last_used_at: null,  // Reset last used since it's a new key
          })
          .eq('id', apiKey.id);

        if (error) throw error;
      } else {
        // -----------------------------------------------------------------------
        // CREATE NEW KEY
        // -----------------------------------------------------------------------
        // First time creating - insert new record
        // -----------------------------------------------------------------------
        const { error } = await supabase
          .from('teacher_api_keys')
          .insert({
            teacher_id: user.id,
            api_key_hash: keyHash,
            api_key_prefix: keyPrefix,
            name: 'Sister App Key',
            is_active: true,
          });

        if (error) throw error;
      }

      // Store the actual key temporarily so user can copy it
      // This is the ONLY time the actual key is visible
      setNewApiKey(newKey);
      setShowKey(true);
      
      // Refresh the key record from database
      await loadApiKey();

      toast({
        title: apiKey ? "API Key Regenerated" : "API Key Created",
        description: "Make sure to copy your new API key now. You won't be able to see it again!",
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: "Error",
        description: "Failed to generate API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // COPY KEY TO CLIPBOARD
  // ---------------------------------------------------------------------------
  // Copies the newly generated key to clipboard and shows feedback.
  // ---------------------------------------------------------------------------
  const copyToClipboard = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard.",
      });
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ---------------------------------------------------------------------------
  // TOGGLE KEY ACTIVE STATUS
  // ---------------------------------------------------------------------------
  // Enables or disables the API key without deleting it.
  // Useful for temporarily suspending sister app access.
  // ---------------------------------------------------------------------------
  const toggleKeyActive = async () => {
    if (!apiKey) return;

    try {
      const { error } = await supabase
        .from('teacher_api_keys')
        .update({ is_active: !apiKey.is_active })
        .eq('id', apiKey.id);

      if (error) throw error;

      await loadApiKey();
      toast({
        title: apiKey.is_active ? "API Key Disabled" : "API Key Enabled",
        description: apiKey.is_active 
          ? "The sister app can no longer use this key."
          : "The sister app can now use this key.",
      });
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast({
        title: "Error",
        description: "Failed to update API key status.",
        variant: "destructive",
      });
    }
  };

  // ---------------------------------------------------------------------------
  // ENDPOINT URL
  // ---------------------------------------------------------------------------
  // The full URL that the sister app should POST to.
  // Uses the Supabase project ID to construct the edge function URL.
  // ---------------------------------------------------------------------------
  const endpointUrl = `https://rjlqmfthemfpetpcydog.supabase.co/functions/v1/receive-sister-app-data`;

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  // Show spinner while loading existing key data
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  return (
    <Card>
      {/* ----------------------------------------------------------------------- */}
      {/* CARD HEADER */}
      {/* ----------------------------------------------------------------------- */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          NYClogic Scholar Ai API Key
        </CardTitle>
        <CardDescription>
          Generate an API key for NYClogic Scholar Ai to send graded work and activity data back to NYCLogic Ai.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* --------------------------------------------------------------------- */}
        {/* SECURITY NOTICE */}
        {/* --------------------------------------------------------------------- */}
        {/* Reminds users that keys are stored securely and can only be seen once */}
        {/* --------------------------------------------------------------------- */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security:</strong> Your API key is stored securely as a hash. Once generated, it can only be viewed immediately. Keep it secret!
          </AlertDescription>
        </Alert>

        {/* --------------------------------------------------------------------- */}
        {/* ENDPOINT URL SECTION */}
        {/* --------------------------------------------------------------------- */}
        {/* Shows the URL the sister app needs to POST to */}
        {/* --------------------------------------------------------------------- */}
        <div className="space-y-2">
          <Label>API Endpoint</Label>
          <div className="flex gap-2">
            <Input
              value={endpointUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(endpointUrl);
                toast({ title: "Copied!", description: "Endpoint URL copied to clipboard." });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The sister app should POST data to this endpoint with the API key in the <code className="bg-muted px-1 rounded">x-api-key</code> header.
          </p>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* EXISTING KEY DISPLAY / CREATE KEY BUTTON */}
        {/* --------------------------------------------------------------------- */}
        {/* If key exists: show status, last used, enable/disable, regenerate */}
        {/* If no key: show create button */}
        {/* --------------------------------------------------------------------- */}
        {apiKey ? (
          <div className="space-y-4">
            {/* Current key info card */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Current API Key</Label>
                  {/* Show only the prefix (first 12 chars) for identification */}
                  <p className="font-mono text-sm mt-1">{apiKey.api_key_prefix}</p>
                </div>
                {/* Active/Inactive status badge */}
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  apiKey.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}>
                  {apiKey.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(apiKey.created_at).toLocaleDateString()}</p>
                {apiKey.last_used_at && (
                  <p>Last used: {new Date(apiKey.last_used_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {/* Enable/Disable toggle button */}
              <Button
                variant="outline"
                onClick={toggleKeyActive}
              >
                {apiKey.is_active ? 'Disable Key' : 'Enable Key'}
              </Button>
              
              {/* Regenerate key with confirmation dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Key
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate the current API key. The sister app will need to be updated with the new key. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={createOrRegenerateKey} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          /* No key exists yet - show create button */
          <Button onClick={createOrRegenerateKey} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Key className="h-4 w-4 mr-2" />
            )}
            Generate API Key
          </Button>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* NEWLY GENERATED KEY DISPLAY */}
        {/* --------------------------------------------------------------------- */}
        {/* This only shows immediately after generating a new key. */}
        {/* It's the ONLY time the user can see/copy the full key. */}
        {/* --------------------------------------------------------------------- */}
        {newApiKey && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="space-y-3">
              <p className="font-medium text-green-800 dark:text-green-200">
                Your new API key (copy it now - you won't see it again!):
              </p>
              <div className="flex gap-2">
                {/* Key input with show/hide toggle */}
                <Input
                  type={showKey ? "text" : "password"}
                  value={newApiKey}
                  readOnly
                  className="font-mono text-sm bg-white dark:bg-gray-900"
                />
                {/* Show/hide button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {/* Copy button */}
                <Button
                  variant={copied ? "default" : "outline"}
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* API DOCUMENTATION */}
        {/* --------------------------------------------------------------------- */}
        {/* Reference documentation for sister app developers */}
        {/* Shows the expected request format and available actions */}
        {/* --------------------------------------------------------------------- */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-medium">API Documentation</h4>
          <p className="text-sm text-muted-foreground">
            The sister app can send data using the following format:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`POST ${endpointUrl}
Headers:
  x-api-key: your_api_key
  Content-Type: application/json

Body:
{
  "action": "grade_completed",
  "student_id": "uuid-of-student",
  "data": {
    "activity_name": "Math Quiz Level 5",
    "score": 85,
    "topic_name": "Algebra",
    "xp_earned": 42,
    "coins_earned": 21
  }
}

Actions: grade_completed, activity_completed, 
         reward_earned, level_up, achievement_unlocked`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
