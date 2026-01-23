import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'teacher' | 'student' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  authError: string | null;
  clearAuthError: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_ROLES: UserRole[] = ['teacher', 'admin'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    // Get initial session - simple and fast
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        // Fetch role in background, don't block loading
        supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role) {
              setUserRole(data.role as UserRole);
            }
          });
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Fetch role in background
          supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSession.user.id)
            .single()
            .then(({ data }) => {
              if (data?.role) {
                setUserRole(data.role as UserRole);
              }
            });
        } else {
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'teacher' },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error: error as Error | null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    if (!data.user) {
      return { error: new Error('Sign in failed. Please try again.') };
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (!profile?.role) {
      await supabase.auth.signOut();
      return { error: new Error('Account setup incomplete. Please try again.') };
    }

    if (!ALLOWED_ROLES.includes(profile.role as UserRole)) {
      await supabase.auth.signOut();
      setAuthError('This portal is for teachers only. Please use the Student Portal to sign in.');
      return { error: new Error('This portal is for teachers only.') };
    }

    // Update state
    setUserRole(profile.role as UserRole);
    setSession(data.session);
    setUser(data.user);

    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  }, []);

  const signOut = useCallback(async () => {
    setUserRole(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, authError, clearAuthError, signUp, signIn, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
