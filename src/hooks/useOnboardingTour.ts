import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

const TOUR_COMPLETED_KEY = 'scan-genius-tour-completed';

export function useOnboardingTour() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [tourReady, setTourReady] = useState(false);

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
    }
  }, [user]);

  const completeTour = () => {
    if (user) {
      localStorage.setItem(`${TOUR_COMPLETED_KEY}-${user.id}`, 'true');
    }
    setShowTour(false);
  };

  const resetTour = () => {
    if (user) {
      localStorage.removeItem(`${TOUR_COMPLETED_KEY}-${user.id}`);
    }
    setShowTour(true);
  };

  return {
    showTour,
    tourReady,
    completeTour,
    resetTour,
  };
}
