import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

const TOUR_COMPLETED_KEY = 'nyclogic-ai-tour-completed';

// Global tour trigger for external components
let globalTourTrigger: (() => void) | null = null;

export function triggerOnboardingTour() {
  if (globalTourTrigger) {
    globalTourTrigger();
  }
}

export function useOnboardingTour() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [tourReady, setTourReady] = useState(false);

  const resetTour = useCallback(() => {
    if (user) {
      localStorage.removeItem(`${TOUR_COMPLETED_KEY}-${user.id}`);
    }
    setShowTour(true);
    setTourReady(true);
  }, [user]);

  useEffect(() => {
    // Register the global trigger
    globalTourTrigger = resetTour;
    return () => {
      globalTourTrigger = null;
    };
  }, [resetTour]);

  useEffect(() => {
    if (!user) return;

    // Check if user has completed the tour
    const tourCompleted = localStorage.getItem(`${TOUR_COMPLETED_KEY}-${user.id}`);
    
    if (!tourCompleted) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setShowTour(true);
        setTourReady(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setTourReady(true);
    }
  }, [user]);

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}-${user.id}`, 'true');
    }
    setShowTour(false);
  };

  return {
    showTour,
    tourReady,
    completeTour,
    resetTour,
  };
}
