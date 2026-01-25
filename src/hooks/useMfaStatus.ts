import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type MfaStatus = 'loading' | 'enrolled' | 'not_enrolled' | 'needs_verification';

// Check if URL contains OAuth callback parameters
function isOAuthCallback(): boolean {
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Check for OAuth callback indicators in URL hash or search params
  return (
    hash.includes('access_token') ||
    hash.includes('error') ||
    searchParams.has('code') ||
    searchParams.has('error')
  );
}

export function useMfaStatus() {
  const [status, setStatus] = useState<MfaStatus>('loading');
  const isProcessingOAuth = useRef(false);

  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        // If we're processing an OAuth callback, wait for auth to settle
        // This prevents race conditions where MFA check happens before OAuth tokens are processed
        if (isOAuthCallback() && !isProcessingOAuth.current) {
          isProcessingOAuth.current = true;
          // Give Supabase time to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('not_enrolled');
          isProcessingOAuth.current = false;
          return;
        }

        // For OAuth sessions (Google sign-in), skip MFA verification requirement
        // OAuth providers have their own authentication which is considered strong auth
        const isOAuthSession = session.user?.app_metadata?.provider === 'google' ||
                              session.user?.identities?.some(i => i.provider === 'google' && i.last_sign_in_at);
        
        // If we have a provider token (fresh OAuth), consider the session fully authenticated
        if (session.provider_token) {
          setStatus('enrolled');
          isProcessingOAuth.current = false;
          return;
        }

        // Check AAL level - if AAL2, they've completed MFA verification
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel === 'aal2') {
          setStatus('enrolled');
          isProcessingOAuth.current = false;
          return;
        }

        // Check if they have a verified factor
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

        if (hasVerifiedFactor) {
          // Has factor but needs to verify (session is AAL1)
          // However, if this is an OAuth session, don't require MFA verification
          if (isOAuthSession) {
            setStatus('enrolled');
          } else {
            setStatus('needs_verification');
          }
        } else {
          // No verified factor, needs to enroll
          setStatus('not_enrolled');
        }
        
        isProcessingOAuth.current = false;
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setStatus('not_enrolled');
        isProcessingOAuth.current = false;
      }
    };

    checkMfaStatus();

    // Listen for auth state changes
    // Keep the callback synchronous and defer auth calls to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // On auth state change, recheck MFA status
      // Give a small delay for OAuth callbacks to fully process
      const delay = (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') ? 100 : 0;
      setTimeout(() => checkMfaStatus(), delay);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { status, isLoading: status === 'loading' };
}
