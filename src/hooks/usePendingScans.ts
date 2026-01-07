import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface PendingScan {
  id: string;
  image_url: string;
  student_id: string | null;
  class_id: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  student?: {
    first_name: string;
    last_name: string;
  } | null;
  class?: {
    name: string;
  } | null;
}

export function usePendingScans() {
  const { user } = useAuth();
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingScans = useCallback(async () => {
    if (!user) {
      setPendingScans([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('pending_scans')
        .select(`
          id,
          image_url,
          student_id,
          class_id,
          notes,
          status,
          created_at,
          student:students(first_name, last_name),
          class:classes(name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = (data || []).map(scan => ({
        ...scan,
        student: Array.isArray(scan.student) ? scan.student[0] : scan.student,
        class: Array.isArray(scan.class) ? scan.class[0] : scan.class,
      }));

      setPendingScans(transformedData);
    } catch (error) {
      console.error('Error fetching pending scans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingScans();
  }, [fetchPendingScans]);

  const updateScanStatus = async (scanId: string, status: 'pending' | 'analyzed') => {
    try {
      const { error } = await supabase
        .from('pending_scans')
        .update({ status })
        .eq('id', scanId);

      if (error) throw error;
      await fetchPendingScans();
    } catch (error) {
      console.error('Error updating scan status:', error);
    }
  };

  const updateScanStudent = async (scanId: string, studentId: string | null) => {
    try {
      const { error } = await supabase
        .from('pending_scans')
        .update({ student_id: studentId })
        .eq('id', scanId);

      if (error) throw error;
      await fetchPendingScans();
    } catch (error) {
      console.error('Error updating scan student:', error);
    }
  };

  return {
    pendingScans,
    isLoading,
    refresh: fetchPendingScans,
    updateScanStatus,
    updateScanStudent,
  };
}
