import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Factor {
  id: string;
  friendly_name?: string;
  status: 'verified' | 'unverified';
  created_at: string;
}

export function TwoFactorSettings() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const loadFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.totp || []);
    } catch (error) {
      console.error('Error loading factors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleResetMfa = async () => {
    setIsResetting(true);
    try {
      // Unenroll all factors
      for (const factor of factors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      
      toast.success('Two-factor authentication has been reset');
      setShowResetDialog(false);
      
      // Redirect to re-enroll
      navigate('/mfa-enroll');
    } catch (error: any) {
      console.error('Error resetting MFA:', error);
      toast.error(error.message || 'Failed to reset 2FA');
    } finally {
      setIsResetting(false);
    }
  };

  const verifiedFactor = factors.find(f => f.status === 'verified');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Protect your account with an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifiedFactor ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Two-factor authentication is enabled
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your account is protected with an authenticator app
                  </p>
                </div>
                <Badge variant="outline" className="border-green-300 text-green-700 dark:text-green-300">
                  Active
                </Badge>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {verifiedFactor.friendly_name || 'Authenticator App'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(verifiedFactor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowResetDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  If you lose access to your authenticator app, you'll need to contact support to regain access to your account.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Two-factor authentication required
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Please set up 2FA to continue using the application
                  </p>
                </div>
              </div>

              <Button onClick={() => navigate('/mfa-enroll')} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Set Up Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current authenticator and require you to set up a new one. 
              You'll need to scan a new QR code with your authenticator app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetMfa}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
