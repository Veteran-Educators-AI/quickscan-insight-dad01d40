import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Loader2, Mail, CheckCircle2, Sparkles } from 'lucide-react';
import nyclogicLogo from '@/assets/nycologic-ai-logo.png';

export default function StudentQuickJoin() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [className, setClassName] = useState<string | null>(null);
  const [loadingClass, setLoadingClass] = useState(true);

  const classCode = searchParams.get('code')?.toUpperCase() || '';

  // Fetch class name for display
  useEffect(() => {
    const fetchClassName = async () => {
      if (!classCode) {
        setLoadingClass(false);
        return;
      }

      const { data } = await supabase
        .from('classes')
        .select('name')
        .eq('join_code', classCode)
        .maybeSingle();

      if (data) {
        setClassName(data.name);
      }
      setLoadingClass(false);
    };

    fetchClassName();
  }, [classCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Enter your email',
        description: 'Please enter your school email address.',
        variant: 'destructive',
      });
      return;
    }

    if (!classCode) {
      toast({
        title: 'Missing class code',
        description: 'This link is missing the class code. Ask your teacher for a new link.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-student-magic-link', {
        body: {
          email: email.trim().toLowerCase(),
          classCode,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Check your email!',
        description: 'We sent you a magic link to join the class.',
      });
    } catch (error: any) {
      console.error('Magic link error:', error);
      toast({
        title: 'Failed to send link',
        description: error.message || 'Please try again or contact your teacher.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!classCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="border-red-500/30 bg-red-500/10 backdrop-blur-lg max-w-md">
          <CardContent className="pt-8 pb-6 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
            <p className="text-white/70">
              This join link is missing the class code. Please ask your teacher for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-white mb-2">Join Class</h1>
          {loadingClass ? (
            <p className="text-white/60">Loading...</p>
          ) : className ? (
            <p className="text-purple-400 font-medium">{className}</p>
          ) : (
            <p className="text-white/60">Class code: <span className="font-mono text-purple-400">{classCode}</span></p>
          )}
        </div>

        {emailSent ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10 backdrop-blur-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Check Your Email!</h2>
              <p className="text-white/70 mb-4">
                We sent a magic link to <span className="text-emerald-400 font-medium">{email}</span>
              </p>
              <p className="text-white/50 text-sm">
                Click the link in your email to join the class instantly. The link expires in 24 hours.
              </p>
              <Button
                variant="ghost"
                className="mt-6 text-white/60 hover:text-white"
                onClick={() => setEmailSent(false)}
              >
                Use a different email
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Quick Join
                </CardTitle>
                <CardDescription className="text-white/60">
                  Enter your email and we'll send you a magic link - no password needed!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Your Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-10"
                    />
                  </div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-purple-300">
                    <strong>One-click join:</strong> We'll email you a magic link. Just click it and you're in!
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
