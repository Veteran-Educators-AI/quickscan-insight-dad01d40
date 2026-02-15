import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GradeFloorSettings {
  gradeFloor: number;
  gradeFloorWithEffort: number;
}

const DEFAULT_SETTINGS: GradeFloorSettings = {
  gradeFloor: 0,
  gradeFloorWithEffort: 0,
};

export function useGradeFloorSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GradeFloorSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('grade_floor, grade_floor_with_effort')
        .eq('teacher_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading grade floor settings:', error);
        return;
      }

      if (data) {
        setSettings({
          gradeFloor: data.grade_floor ?? DEFAULT_SETTINGS.gradeFloor,
          gradeFloorWithEffort: data.grade_floor_with_effort ?? DEFAULT_SETTINGS.gradeFloorWithEffort,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGrade = (
    percentage: number, 
    hasWork: boolean, 
    regentsScore?: number
  ): number => {
    const { gradeFloor, gradeFloorWithEffort } = settings;
    
    // CRITICAL: No work shown = 0 - no exceptions
    // This catches blank pages, only question text visible, no student writing
    if (!hasWork) {
      return gradeFloor;
    }

    // Student showed work - grade is determined by the backend decision tree
    // The backend already applies the correct tier (0-97) based on boolean analysis
    // Frontend should NOT inflate grades beyond what the backend computed
    
    // Maximum grade from calculation is 95 (Regents 4 = Exceeding Standards)
    // 100 is reserved for teacher overrides / truly exceptional demonstrated mastery
    const maxCalculatedGrade = 95;

    // If regents score is available, use it for conversion
    if (regentsScore !== undefined && regentsScore >= 0) {
      const regentsToGrade: Record<number, number> = {
        4: 95,  // Exceeding Standards - max without override
        3: 90,  // Meeting Standards - no errors should be 90+
        2: 75,  // Approaching Standards
        1: 60,  // Limited understanding
        0: 0,   // No understanding - let backend decide actual grade
      };
      const convertedGrade = regentsToGrade[regentsScore] ?? 0;
      return Math.min(maxCalculatedGrade, convertedGrade);
    }

    // Calculate from percentage - scale between 0 and max (95)
    if (percentage > 0) {
      const scaledGrade = Math.round((percentage / 100) * maxCalculatedGrade);
      return Math.min(maxCalculatedGrade, scaledGrade);
    }

    // Has work but no percentage calculated = 0 (let backend decide)
    return 0;
  };

  const refreshSettings = () => {
    if (user) {
      loadSettings();
    }
  };

  return {
    ...settings,
    isLoading,
    calculateGrade,
    refreshSettings,
  };
}