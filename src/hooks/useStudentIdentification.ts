import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IdentificationResult {
  qrCodeDetected: boolean;
  qrCodeContent: string | null;
  parsedQRCode: { studentId: string; questionId?: string; version?: number } | null;
  handwrittenName: string | null;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedQuestionId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

interface StudentRosterItem {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

export function useStudentIdentification() {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identifyStudent = useCallback(async (
    imageBase64: string,
    studentRoster: StudentRosterItem[]
  ): Promise<IdentificationResult | null> => {
    if (!imageBase64 || studentRoster.length === 0) {
      return null;
    }

    setIsIdentifying(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64,
          identifyOnly: true,
          studentRoster: studentRoster.map(s => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            student_id: s.student_id,
          })),
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Identification failed');
      }

      const result = data.identification as IdentificationResult;
      setIdentificationResult(result);

      // Show appropriate toast based on confidence
      if (result.confidence === 'high') {
        toast.success(`Identified: ${result.matchedStudentName}`, {
          description: result.qrCodeDetected ? 'QR code detected' : 'Handwritten name matched',
        });
      } else if (result.confidence === 'medium') {
        toast.info(`Possible match: ${result.matchedStudentName}`, {
          description: 'Please verify this is correct',
        });
      } else if (result.handwrittenName) {
        toast.warning(`Found name: "${result.handwrittenName}"`, {
          description: 'Could not match to a student in the roster',
        });
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to identify student';
      setError(message);
      console.error('Student identification error:', err);
      return null;
    } finally {
      setIsIdentifying(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setIdentificationResult(null);
    setError(null);
  }, []);

  return {
    identifyStudent,
    isIdentifying,
    identificationResult,
    error,
    clearResult,
  };
}
