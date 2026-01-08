import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import scanGeniusLogo from '@/assets/scan-genius-logo.png';

export default function MfaChallenge() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get the TOTP factor for the current user
    const getFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error('Error listing factors:', error);
        toast.error('Failed to load 2FA. Please try logging in again.');
        navigate('/login');
        return;
      }

      const totpFactor = data?.totp?.[0];
      if (!totpFactor) {
        // No TOTP enrolled, redirect to enrollment
        navigate('/mfa-enroll');
        return;
      }

      setFactorId(totpFactor.id);
    };

    getFactors();
  }, [navigate]);

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        toast.error('Invalid code. Please try again.');
        setCode('');
      } else {
        toast.success('Verification successful!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error(error.message || 'Verification failed');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && factorId) {
      handleVerify();
    }
  }, [code, factorId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={scanGeniusLogo} 
            alt="The Scan Genius" 
            className="h-16 w-auto mx-auto mb-4"
          />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button 
              onClick={handleVerify} 
              className="w-full" 
              disabled={code.length !== 6 || isVerifying || !factorId}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Open your authenticator app (Google Authenticator, Authy, etc.) and enter the code shown for The Scan Genius.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
