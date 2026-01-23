import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

function clearSupabaseAuth() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    let isMounted = true;

    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        clearSupabaseAuth();
        setLoading(false);
        setSession(null);
        setUser(null);
        setUserRole(null);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            const role = await fetchUserRole(session.user.id);

            if (!role) {
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setUserRole(null);
              setLoading(false);
              return;
            }

            if (!ALLOWED_ROLES.includes(role)) {
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setUserRole(null);
              setAuthError('This portal is for teachers only. Please use the Student Portal to sign in.');
              setLoading(false);
              return;
            }

            setUserRole(role);
          } else {
            setUserRole(null);
          }

          setSession(session);
          setUser(session?.user ?? null);
        } catch (error) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setUserRole(null);
        } finally {
          setLoading(false);
        }
      }
    );

    const getSessionWithTimeout = withTimeout(
      supabase.auth.getSession(),
      5000,
      'Session fetch timed out'
    );

    getSessionWithTimeout.then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const role = await withTimeout(
            fetchUserRole(session.user.id),
            5000,
            'Role fetch timed out'
          );

          if (!role) {
            clearSupabaseAuth();
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            setLoading(false);
            return;
          }

          if (!ALLOWED_ROLES.includes(role)) {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setUserRole(null);
            setAuthError('This portal is for teachers only. Please use the Student Portal to sign in.');
            setLoading(false);
            return;
          }

          setUserRole(role);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        clearSupabaseAuth();
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    }).catch(() => {
      clearSupabaseAuth();
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'teacher' },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    if (data.user) {
      const role = await fetchUserRole(data.user.id);

      if (!role) {
        await supabase.auth.signOut();
        return { error: new Error('Account setup incomplete. Please try again.') };
      }

      if (!ALLOWED_ROLES.includes(role)) {
        await supabase.auth.signOut();
        return {
          error: new Error('This portal is for teachers only. Please use the Student Portal to sign in.')
        };
      }

      setUserRole(role);
    }

    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setUserRole(null);
    await supabase.auth.signOut();
  };

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
