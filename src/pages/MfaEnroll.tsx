import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, CheckCircle, Smartphone, Download, Copy, Check, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import nycologicLogo from '@/assets/nycologic-logo.png';
import { generateRecoveryCodes, hashRecoveryCode, formatRecoveryCodesForPrint } from '@/lib/recoveryCodeUtils';

export default function MfaEnroll() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'recovery'>('setup');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [savedCodes, setSavedCodes] = useState(false);
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
        // Generate recovery codes
        const codes = generateRecoveryCodes(8);
        setRecoveryCodes(codes);

        // Save hashed codes to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete any existing codes first
          await supabase.from('mfa_recovery_codes').delete().eq('user_id', user.id);

          // Insert new hashed codes
          const hashedCodes = await Promise.all(
            codes.map(async (code) => ({
              user_id: user.id,
              code_hash: await hashRecoveryCode(code),
            }))
          );

          await supabase.from('mfa_recovery_codes').insert(hashedCodes);
        }

        setStep('recovery');
        toast.success('Two-factor authentication enabled!');
      }
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error(error.message || 'Verification failed');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyCodes = async () => {
    const text = formatRecoveryCodesForPrint(recoveryCodes);
    await navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    toast.success('Recovery codes copied to clipboard');
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = formatRecoveryCodesForPrint(recoveryCodes);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scan-genius-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedCodes(true);
    toast.success('Recovery codes downloaded');
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
            src={nycologicLogo} 
            alt="NYClogic Ai" 
            className="h-16 w-auto mx-auto mb-4"
          />
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>
              {step === 'recovery' ? 'Save Your Recovery Codes' : 'Set Up Two-Factor Authentication'}
            </CardTitle>
            <CardDescription>
              {step === 'recovery' 
                ? 'Store these codes safely - you\'ll need them if you lose your phone'
                : 'Two-factor authentication is required to protect student data'}
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
            ) : step === 'verify' ? (
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
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Important:</strong> Each code can only be used once. Store these in a safe place like a password manager.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-4 bg-muted/50 rounded-lg font-mono text-sm">
                  {recoveryCodes.map((code, index) => (
                    <div key={index} className="px-2 py-1 bg-background rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCopyCodes}
                    className="flex-1"
                  >
                    {copiedCodes ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadCodes}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>

                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full"
                  disabled={!savedCodes && !copiedCodes}
                >
                  {savedCodes || copiedCodes ? 'Continue to Dashboard' : 'Save codes first to continue'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
