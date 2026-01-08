import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { getStudentPseudonym, getPseudonymInitials } from './studentPseudonyms';
import { supabase } from '@/integrations/supabase/client';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface StudentNameContextType {
  revealRealNames: boolean;
  toggleRevealNames: () => void;
  getDisplayName: (studentId: string, firstName: string, lastName: string) => string;
  getDisplayInitials: (studentId: string, firstName: string, lastName: string) => string;
}

const StudentNameContext = createContext<StudentNameContextType | undefined>(undefined);

// Log audit event to database
async function logAuditEvent(action: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ferpa_audit_log').insert({
      teacher_id: user.id,
      action,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export function StudentNameProvider({ children }: { children: ReactNode }) {
  const [revealRealNames, setRevealRealNames] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetToPrivate = useCallback(() => {
    setRevealRealNames(false);
    logAuditEvent('auto_reverted_to_pseudonyms');
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(resetToPrivate, INACTIVITY_TIMEOUT_MS);
  }, [resetToPrivate]);

  // Set up activity listeners when real names are visible
  useEffect(() => {
    if (!revealRealNames) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Start the inactivity timer
    resetInactivityTimer();

    // Activity events to track
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [revealRealNames, resetInactivityTimer]);

  const toggleRevealNames = useCallback(() => {
    setRevealRealNames(prev => {
      const newValue = !prev;
      logAuditEvent(newValue ? 'revealed_real_names' : 'hidden_real_names');
      return newValue;
    });
  }, []);

  const getDisplayName = useCallback((studentId: string, firstName: string, lastName: string) => {
    if (revealRealNames) {
      return `${firstName} ${lastName}`;
    }
    return getStudentPseudonym(studentId);
  }, [revealRealNames]);

  const getDisplayInitials = useCallback((studentId: string, firstName: string, lastName: string) => {
    if (revealRealNames) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    const pseudonym = getStudentPseudonym(studentId);
    return getPseudonymInitials(pseudonym);
  }, [revealRealNames]);

  return (
    <StudentNameContext.Provider value={{ 
      revealRealNames, 
      toggleRevealNames, 
      getDisplayName, 
      getDisplayInitials 
    }}>
      {children}
    </StudentNameContext.Provider>
  );
}

export function useStudentNames() {
  const context = useContext(StudentNameContext);
  if (context === undefined) {
    throw new Error('useStudentNames must be used within a StudentNameProvider');
  }
  return context;
}
