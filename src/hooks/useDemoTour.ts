import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

const DEMO_TOUR_KEY = 'nyclogic-ai-demo-tour-completed';
const DEMO_EMAILS = ['demo.teacher@nyclogic.edu', 'demo.admin@nyclogic.edu'];

export function useDemoTour() {
  const { user } = useAuth();
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [demoTourReady, setDemoTourReady] = useState(false);

  const isDemoUser = user?.email && DEMO_EMAILS.includes(user.email);

  const resetDemoTour = useCallback(() => {
    if (user) {
      localStorage.removeItem(`${DEMO_TOUR_KEY}-${user.id}`);
    }
    setShowDemoTour(true);
    setDemoTourReady(true);
  }, [user]);

  useEffect(() => {
    if (!user || !isDemoUser) {
      setDemoTourReady(false);
      return;
    }

    // Check if demo user has completed the demo tour
    const tourCompleted = localStorage.getItem(`${DEMO_TOUR_KEY}-${user.id}`);
    
    if (!tourCompleted) {
      // Delay to ensure dashboard is fully loaded
      const timer = setTimeout(() => {
        setShowDemoTour(true);
        setDemoTourReady(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setDemoTourReady(true);
    }
  }, [user, isDemoUser]);

  const completeDemoTour = () => {
    if (user) {
      localStorage.setItem(`${DEMO_TOUR_KEY}-${user.id}`, 'true');
    }
    setShowDemoTour(false);
  };

  return {
    showDemoTour,
    demoTourReady,
    completeDemoTour,
    resetDemoTour,
    isDemoUser: !!isDemoUser,
  };
}
