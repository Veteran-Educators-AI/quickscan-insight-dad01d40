import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import nyclogicLogo from '@/assets/nycologic-ai-logo.png';

type JoinStatus = 'verifying' | 'success' | 'error';

interface JoinResult {
  studentName: string;
  className: string;
}

export default function StudentMagicCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<JoinStatus>('verifying');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<JoinResult | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setError('Invalid link - missing token');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-student-magic-link', {
          body: { token },
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Failed to join class');
        }

        setResult({
          studentName: data.studentName,
          className: data.className,
        });
        setStatus('success');

        // Redirect to student dashboard after delay
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 3000);
      } catch (err: any) {
        console.error('Magic link verification error:', err);
        setStatus('error');
        setError(err.message || 'This link may have expired. Ask your teacher for a new one.');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={nyclogicLogo} alt="NYCLogic" className="h-12 w-12" />
            <GraduationCap className="h-10 w-10 text-purple-400" />
          </div>
        </div>

        {status === 'verifying' && (
          <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <Loader2 className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">Joining Class...</h2>
              <p className="text-white/60">Please wait while we set up your account.</p>
            </CardContent>
          </Card>
        )}

        {status === 'success' && result && (
          <Card className="border-emerald-500/30 bg-emerald-500/10 backdrop-blur-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome, {result.studentName}!</h2>
              <p className="text-white/70 mb-4">
                You've successfully joined <span className="text-emerald-400 font-medium">{result.className}</span>
              </p>
              <p className="text-white/50 text-sm">Redirecting to your dashboard...</p>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Unable to Join</h2>
              <p className="text-white/70 mb-6">{error}</p>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => navigate('/student/login')}
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
