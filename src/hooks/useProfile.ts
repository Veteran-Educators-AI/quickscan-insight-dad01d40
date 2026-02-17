import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'teacher' | 'student' | 'admin';
  email: string | null;
  created_at: string;
}

/**
 * Unified Profile Hook
 * 
 * Consolidates all profile queries into a single cached call.
 * Previously, multiple components were fetching profile data separately,
 * causing 5-10 duplicate API calls per page load.
 * 
 * Now uses React Query for automatic caching and deduplication.
 */
export function useProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, email, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (profile data rarely changes)
    gcTime: 30 * 60 * 1000,    // Keep in cache for 30 minutes
  });

  return {
    profile,
    isLoading,
    error,
    refetch,
    // Convenience accessors
    fullName: profile?.full_name || null,
    email: profile?.email || null,
    role: profile?.role || null,
  };
}
