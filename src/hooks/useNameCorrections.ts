import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NameCorrection {
  id: string;
  handwritten_name: string;
  normalized_name: string;
  correct_student_id: string;
  times_used: number;
}

interface StudentMatch {
  studentId: string;
  studentName: string;
  confidence: 'learned' | 'high' | 'medium' | 'low' | 'none';
}

// Normalize name for comparison (lowercase, trim, remove extra spaces)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,'"!?]/g, '');
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 1;
  
  const matrix: number[][] = [];
  const aLen = aLower.length;
  const bLen = bLower.length;
  
  if (aLen === 0) return 0;
  if (bLen === 0) return 0;
  
  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (bLower[i - 1] === aLower[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLen = Math.max(aLen, bLen);
  return 1 - matrix[bLen][aLen] / maxLen;
}

export function useNameCorrections(classId: string | null) {
  const [corrections, setCorrections] = useState<NameCorrection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch learned corrections for this class
  const fetchCorrections = useCallback(async () => {
    if (!classId) {
      setCorrections([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('name_corrections')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('class_id', classId)
        .order('times_used', { ascending: false });

      if (error) throw error;
      setCorrections(data || []);
    } catch (err) {
      console.error('Error fetching name corrections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  // Save a correction when teacher overrides AI identification
  const saveCorrection = useCallback(async (
    handwrittenName: string,
    correctStudentId: string
  ): Promise<boolean> => {
    if (!classId || !handwrittenName?.trim()) return false;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const normalized = normalizeName(handwrittenName);

      // Try to upsert (increment times_used if exists)
      const { data: existing } = await supabase
        .from('name_corrections')
        .select('id, times_used')
        .eq('teacher_id', user.id)
        .eq('class_id', classId)
        .eq('normalized_name', normalized)
        .maybeSingle();

      if (existing) {
        // Update existing correction
        const { error } = await supabase
          .from('name_corrections')
          .update({
            correct_student_id: correctStudentId,
            times_used: existing.times_used + 1,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new correction
        const { error } = await supabase
          .from('name_corrections')
          .insert({
            teacher_id: user.id,
            class_id: classId,
            handwritten_name: handwrittenName.trim(),
            normalized_name: normalized,
            correct_student_id: correctStudentId,
          });

        if (error) throw error;
      }

      // Refresh corrections
      await fetchCorrections();
      
      toast.success('Name correction saved!', {
        description: 'Future scans will remember this correction',
      });
      
      return true;
    } catch (err) {
      console.error('Error saving name correction:', err);
      toast.error('Failed to save correction');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [classId, fetchCorrections]);

  // Check if a handwritten name matches any learned corrections
  const findLearnedMatch = useCallback((
    handwrittenName: string | null | undefined,
    students: Array<{ id: string; first_name: string; last_name: string }>
  ): StudentMatch | null => {
    if (!handwrittenName?.trim() || corrections.length === 0) return null;

    const normalized = normalizeName(handwrittenName);

    // First, try exact normalized match
    const exactMatch = corrections.find(c => c.normalized_name === normalized);
    if (exactMatch) {
      const student = students.find(s => s.id === exactMatch.correct_student_id);
      if (student) {
        return {
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
          confidence: 'learned',
        };
      }
    }

    // Then try fuzzy match on learned corrections (similarity > 0.85)
    for (const correction of corrections) {
      const similarity = calculateSimilarity(normalized, correction.normalized_name);
      if (similarity > 0.85) {
        const student = students.find(s => s.id === correction.correct_student_id);
        if (student) {
          return {
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            confidence: 'learned',
          };
        }
      }
    }

    return null;
  }, [corrections]);

  // Delete a correction
  const deleteCorrection = useCallback(async (correctionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('name_corrections')
        .delete()
        .eq('id', correctionId);

      if (error) throw error;
      
      setCorrections(prev => prev.filter(c => c.id !== correctionId));
      toast.success('Correction removed');
      return true;
    } catch (err) {
      console.error('Error deleting correction:', err);
      toast.error('Failed to remove correction');
      return false;
    }
  }, []);

  return {
    corrections,
    isLoading,
    isSaving,
    fetchCorrections,
    saveCorrection,
    findLearnedMatch,
    deleteCorrection,
  };
}
