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

interface ApiKeyRecord {
  id: string;
  api_key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export function ApiKeySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<ApiKeyRecord | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadApiKey();
    }
  }, [user]);

  const loadApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_api_keys')
        .select('*')
        .eq('teacher_id', user!.id)
        .eq('name', 'Sister App Key')
        .maybeSingle();

      if (error) throw error;
      setApiKey(data);
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'sg_live_';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix + key;
  };

  const hashApiKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createOrRegenerateKey = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    try {
      const newKey = generateApiKey();
      const keyHash = await hashApiKey(newKey);
      const keyPrefix = newKey.substring(0, 12) + '...';

      if (apiKey) {
        // Update existing key
        const { error } = await supabase
          .from('teacher_api_keys')
          .update({
            api_key_hash: keyHash,
            api_key_prefix: keyPrefix,
            last_used_at: null,
          })
          .eq('id', apiKey.id);

        if (error) throw error;
      } else {
        // Create new key
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

      setNewApiKey(newKey);
      setShowKey(true);
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

  const copyToClipboard = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const endpointUrl = `https://wihddyjdfihvnxvvynek.supabase.co/functions/v1/receive-sister-app-data`;

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
          <Key className="h-5 w-5" />
          Sister App API Key
        </CardTitle>
        <CardDescription>
          Generate an API key for the sister app to send graded work and activity data back to ScanGenius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security:</strong> Your API key is stored securely as a hash. Once generated, it can only be viewed immediately. Keep it secret!
          </AlertDescription>
        </Alert>

        {/* Endpoint URL */}
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

        {/* Current API Key */}
        {apiKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Current API Key</Label>
                  <p className="font-mono text-sm mt-1">{apiKey.api_key_prefix}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  apiKey.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                }`}>
                  {apiKey.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {new Date(apiKey.created_at).toLocaleDateString()}</p>
                {apiKey.last_used_at && (
                  <p>Last used: {new Date(apiKey.last_used_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={toggleKeyActive}
              >
                {apiKey.is_active ? 'Disable Key' : 'Enable Key'}
              </Button>
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
          <Button onClick={createOrRegenerateKey} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Key className="h-4 w-4 mr-2" />
            )}
            Generate API Key
          </Button>
        )}

        {/* Show newly generated key */}
        {newApiKey && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="space-y-3">
              <p className="font-medium text-green-800 dark:text-green-200">
                Your new API key (copy it now - you won't see it again!):
              </p>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  value={newApiKey}
                  readOnly
                  className="font-mono text-sm bg-white dark:bg-gray-900"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
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

        {/* API Documentation */}
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
