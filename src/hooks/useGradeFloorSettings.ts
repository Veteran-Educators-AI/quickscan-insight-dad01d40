import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface GradeFloorSettings {
  gradeFloor: number;
  gradeFloorWithEffort: number;
}

const DEFAULT_SETTINGS: GradeFloorSettings = {
  gradeFloor: 55,
  gradeFloorWithEffort: 65,
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
    
    // CRITICAL: No work shown = absolute floor (55) - no exceptions
    // This catches blank pages, only question text visible, no student writing
    if (!hasWork) {
      return gradeFloor;
    }

    // Student showed work - minimum is gradeFloorWithEffort (default 65)
    const minGrade = gradeFloorWithEffort;
    
    // Maximum grade from calculation is 95 (Regents 4 = Exceeding Standards)
    // 100 is reserved for teacher overrides / truly exceptional demonstrated mastery
    const maxCalculatedGrade = 95;

    // If regents score is available, use it for conversion
    if (regentsScore !== undefined && regentsScore >= 0) {
      const regentsToGrade: Record<number, number> = {
        4: 95,  // Exceeding Standards - max without override
        3: 85,  // Meeting Standards
        2: 75,  // Approaching Standards
        1: Math.max(gradeFloorWithEffort, 67),  // Limited understanding
        0: gradeFloorWithEffort,  // Has work but completely wrong
      };
      const convertedGrade = regentsToGrade[regentsScore] ?? minGrade;
      return Math.max(minGrade, Math.min(maxCalculatedGrade, convertedGrade));
    }

    // Calculate from percentage - scale between effort floor and max (95)
    if (percentage > 0) {
      // Map percentage to grade range: 65-95 (not 100)
      const gradeRange = maxCalculatedGrade - gradeFloorWithEffort; // 95 - 65 = 30
      const scaledGrade = Math.round(gradeFloorWithEffort + (percentage / 100) * gradeRange);
      return Math.max(minGrade, Math.min(maxCalculatedGrade, scaledGrade));
    }

    // Has work but no percentage calculated = effort floor
    return minGrade;
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