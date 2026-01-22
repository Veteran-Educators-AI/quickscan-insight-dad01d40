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

// Allowed roles for the teacher/admin app
const ALLOWED_ROLES: UserRole[] = ['teacher', 'admin'];

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user role:', error);
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
    // Set up auth state listener FIRST (before getSession)
    // This is critical for OAuth callbacks to be properly detected
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);

        if (session?.user) {
          // Fetch the user's role from the profiles table
          const role = await fetchUserRole(session.user.id);

          // Check if user has an allowed role for this app
          if (role && !ALLOWED_ROLES.includes(role)) {
            console.log('User role not allowed:', role);
            // Sign out users who don't have teacher/admin role
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
        setLoading(false);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);

        // Check if user has an allowed role for this app
        if (role && !ALLOWED_ROLES.includes(role)) {
          console.log('User role not allowed on init:', role);
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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

    // Check the user's role after successful authentication
    if (data.user) {
      const role = await fetchUserRole(data.user.id);

      if (!role) {
        // Profile doesn't exist yet - this shouldn't happen but handle it
        await supabase.auth.signOut();
        return { error: new Error('Account setup incomplete. Please try again.') };
      }

      if (!ALLOWED_ROLES.includes(role)) {
        // User is a student - sign them out and return error
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
