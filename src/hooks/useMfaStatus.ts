import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type MfaStatus = 'loading' | 'enrolled' | 'not_enrolled' | 'needs_verification';

export function useMfaStatus() {
  const [status, setStatus] = useState<MfaStatus>('loading');

  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('not_enrolled');
          return;
        }

        // Check AAL level - if AAL2, they've completed MFA verification
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel === 'aal2') {
          setStatus('enrolled');
          return;
        }

        // Check if they have a verified factor
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

        if (hasVerifiedFactor) {
          // Has factor but needs to verify (session is AAL1)
          setStatus('needs_verification');
        } else {
          // No verified factor, needs to enroll
          setStatus('not_enrolled');
        }
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setStatus('not_enrolled');
      }
    };

    checkMfaStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkMfaStatus();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { status, isLoading: status === 'loading' };
}
