import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import scanGeniusLogo from '@/assets/scan-genius-logo.png';

export default function MfaEnroll() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const navigate = useNavigate();

  useEffect(() => {
    const enrollMfa = async () => {
      try {
        // Check if already enrolled
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');
        if (verifiedFactor) {
          // Already enrolled and verified
          navigate('/dashboard');
          return;
        }

        // Unenroll any unverified factors first
        for (const factor of factors?.totp || []) {
          if (factor.status !== 'verified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }

        // Enroll new TOTP factor
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'The Scan Genius Authenticator',
        });

        if (error) throw error;

        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      } catch (error: any) {
        console.error('MFA enrollment error:', error);
        toast.error('Failed to set up 2FA. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    enrollMfa();
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
        toast.success('Two-factor authentication enabled!');
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
    if (code.length === 6 && factorId && step === 'verify') {
      handleVerify();
    }
  }, [code, factorId, step]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <CardTitle>Set Up Two-Factor Authentication</CardTitle>
            <CardDescription>
              Two-factor authentication is required to protect student data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 'setup' ? (
              <>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Step 1: Install an authenticator app</p>
                      <p className="text-xs text-muted-foreground">
                        Download Google Authenticator, Authy, or Microsoft Authenticator on your phone
                      </p>
                    </div>
                  </div>

                  {qrCode && (
                    <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
                      <p className="font-medium text-sm text-foreground">Step 2: Scan this QR code</p>
                      <img 
                        src={qrCode} 
                        alt="QR Code for authenticator app" 
                        className="w-48 h-48"
                      />
                      {secret && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                            {secret}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => setStep('verify')} 
                  className="w-full"
                  disabled={!qrCode}
                >
                  I've scanned the QR code
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Step 3: Enter verification code</p>
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit code shown in your authenticator app
                    </p>
                  </div>
                </div>

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

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setStep('setup');
                      setCode('');
                    }}
                    className="flex-1"
                    disabled={isVerifying}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleVerify} 
                    className="flex-1" 
                    disabled={code.length !== 6 || isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Enable'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
