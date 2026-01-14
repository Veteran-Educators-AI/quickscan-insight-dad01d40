import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Loader2, KeyRound, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import nyclogicLogo from '@/assets/nycologic-ai-logo.png';

export default function StudentJoinClass() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinSuccess, setJoinSuccess] = useState<{
    studentName: string;
    className: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/student/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Check if student already has a class
    const checkExistingEnrollment = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        navigate('/student/dashboard');
      }
    };

    checkExistingEnrollment();
  }, [user, navigate]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      toast({
        title: 'Enter a class code',
        description: 'Please enter the class code provided by your teacher.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('join_class_with_code', {
        p_join_code: joinCode.trim().toUpperCase(),
        p_user_email: user?.email || '',
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; student_name?: string; class_name?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to join class');
      }

      setJoinSuccess({
        studentName: result.student_name || 'Student',
        className: result.class_name || 'Class',
      });

      toast({
        title: 'Successfully joined!',
        description: `Welcome to ${result.class_name}!`,
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Failed to join class',
        description: error.message || 'Please check your class code and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/student/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
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
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={nyclogicLogo} alt="NYCLogic" className="h-12 w-12" />
            <GraduationCap className="h-10 w-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Your Class</h1>
          <p className="text-white/60">
            Signed in as <span className="text-purple-400">{user?.email}</span>
          </p>
        </div>

        {joinSuccess ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10 backdrop-blur-lg">
            <CardContent className="pt-8 pb-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Welcome, {joinSuccess.studentName}!</h2>
              <p className="text-white/70">
                You've successfully joined <span className="text-emerald-400 font-medium">{joinSuccess.className}</span>
              </p>
              <p className="text-white/50 text-sm mt-4">Redirecting to your dashboard...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/10 bg-white/5 backdrop-blur-lg">
            <form onSubmit={handleJoinClass}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-purple-400" />
                  Enter Class Code
                </CardTitle>
                <CardDescription className="text-white/60">
                  Ask your teacher for the class code to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-code" className="text-white">Class Code</Label>
                  <Input
                    id="join-code"
                    type="text"
                    placeholder="e.g., ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    maxLength={10}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-2xl tracking-widest font-mono uppercase"
                  />
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-purple-300">
                    <strong>Important:</strong> Your teacher must have added your email ({user?.email}) to the class roster. If you get an error, contact your teacher.
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
                      Joining class...
                    </>
                  ) : (
                    'Join Class'
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
