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

// ============================================================================
// Role Caching Utilities
// ============================================================================

const ROLE_CACHE_KEY = 'user_role_cache';
const ROLE_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface RoleCache {
  userId: string;
  role: UserRole;
  timestamp: number;
}

function getCachedRole(userId: string): UserRole | null {
  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) return null;

    const { userId: cachedUserId, role, timestamp }: RoleCache = JSON.parse(cached);
    
    // Verify cache is for current user and not expired
    if (cachedUserId === userId && Date.now() - timestamp < ROLE_CACHE_EXPIRY) {
      return role;
    }
    
    // Clear expired or mismatched cache
    localStorage.removeItem(ROLE_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedRole(userId: string, role: UserRole): void {
  try {
    const cache: RoleCache = {
      userId,
      role,
      timestamp: Date.now(),
    };
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function clearCachedRole(): void {
  try {
    localStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    // Silently fail
  }
}

// ============================================================================
// Profile Fetching
// ============================================================================

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
  
  // Track if we've already fetched the role for this session to prevent duplicates
  const [roleFetchedForSession, setRoleFetchedForSession] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Handle role verification - called after session is set
  const verifyRoleAndUpdateState = async (userId: string, forceRefresh = false) => {
    // Prevent duplicate fetches for the same session
    if (!forceRefresh && roleFetchedForSession === userId) {
      return;
    }

    // Try to use cached role first
    if (!forceRefresh) {
      const cachedRole = getCachedRole(userId);
      if (cachedRole) {
        setUserRole(cachedRole);
        setRoleFetchedForSession(userId);
        return;
      }
    }

    // Fetch role from database
    const role = await fetchUserRole(userId);
    
    if (!role) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      setRoleFetchedForSession(null);
      clearCachedRole();
      return;
    }

    if (!ALLOWED_ROLES.includes(role)) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      setRoleFetchedForSession(null);
      clearCachedRole();
      setAuthError('This portal is for teachers only. Please use the Student Portal to sign in.');
      return;
    }

    setUserRole(role);
    setRoleFetchedForSession(userId);
    setCachedRole(userId, role);
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

    // onAuthStateChange handles BOTH initial session load AND subsequent changes
    // This eliminates the need for a separate getSession() call
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

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
          setRoleFetchedForSession(null);
        }
      }
    );

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
      // for immediate feedback. Force refresh to ensure we get latest role.
      if (data.user) {
        const role = await fetchUserRole(data.user.id);

        if (!role) {
          await supabase.auth.signOut();
          clearCachedRole();
          return { error: new Error('Account setup incomplete. Please try again.') };
        }

        if (!ALLOWED_ROLES.includes(role)) {
          await supabase.auth.signOut();
          clearCachedRole();
          return {
            error: new Error('This portal is for teachers only. Please use the Student Portal to sign in.')
          };
        }

        setUserRole(role);
        setRoleFetchedForSession(data.user.id);
        setCachedRole(data.user.id, role);
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
    setRoleFetchedForSession(null);
    clearCachedRole();
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
