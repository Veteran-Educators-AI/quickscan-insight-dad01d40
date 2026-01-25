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

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch user role:', error);
      return null;
    }

    return data.role as UserRole;
  } catch (err) {
    console.error('Error fetching role:', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Handle role verification - called after session is set
  const verifyRoleAndUpdateState = async (userId: string) => {
    const role = await fetchUserRole(userId);
    
    if (!role) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      return;
    }

    if (!ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      setAuthError('This portal is for teachers only. Please use the Student Portal to sign in.');
      return;
    }

    setUserRole(role);
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout - if auth takes too long, stop loading
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out');
        setLoading(false);
      }
    }, 8000);

    // CRITICAL: onAuthStateChange callback must be synchronous
    // Defer any additional Supabase calls with setTimeout to prevent deadlock
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state updates only
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer role verification to prevent auth deadlock
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              verifyRoleAndUpdateState(session.user.id);
            }
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        verifyRoleAndUpdateState(session.user.id);
      }
    }).catch((err) => {
      console.error('Failed to get session:', err);
      if (isMounted) {
        setLoading(false);
      }
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      // Role will be verified via onAuthStateChange, but we also check here
      // for immediate feedback
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
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err instanceof Error ? err : new Error('Sign in failed. Please try again.') };
    }
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
