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
    // CRITICAL: If there's any work, minimum is gradeFloorWithEffort (default 65)
    // Only completely blank work gets gradeFloor (default 55)
    const minGrade = hasWork ? gradeFloorWithEffort : gradeFloor;

    // If regents score is available, use it for conversion
    if (regentsScore !== undefined && regentsScore >= 0) {
      const regentsToGrade: Record<number, number> = {
        4: 95,  // Exceeding
        3: 85,  // Meeting
        2: 75,  // Approaching
        1: Math.max(gradeFloorWithEffort, 67),  // Limited understanding - slightly above effort floor
        0: hasWork ? gradeFloorWithEffort : gradeFloor,  // Even 0 with work gets effort floor
      };
      const convertedGrade = regentsToGrade[regentsScore] ?? minGrade;
      return Math.max(minGrade, convertedGrade);
    }

    // Calculate from percentage
    if (percentage > 0) {
      // Map percentage to grade range above the effort floor
      const scaledGrade = Math.round(gradeFloorWithEffort + (percentage / 100) * (100 - gradeFloorWithEffort));
      return Math.max(minGrade, scaledGrade);
    }

    // No percentage but has work = effort floor
    // No work at all = absolute floor
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