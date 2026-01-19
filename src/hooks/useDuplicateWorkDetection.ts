import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingAttemptId?: string;
  existingGrade?: number;
  matchType?: 'exact_ocr' | 'similar_ocr' | 'image_hash';
  createdAt?: string;
}

// Simple hash function for quick comparison
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Normalize OCR text for comparison (remove whitespace variations, normalize case)
function normalizeOcrText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Calculate similarity between two strings (Jaccard similarity on words)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeOcrText(text1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeOcrText(text2).split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function useDuplicateWorkDetection() {
  const { user } = useAuth();

  /**
   * Check if this student work has already been analyzed
   * @param studentId - The student's ID
   * @param questionId - The question ID (optional - if not provided, checks across all questions)
   * @param ocrText - The OCR text from the current scan
   * @param imageDataUrl - The image data URL for hash comparison
   * @returns DuplicateCheckResult with details if duplicate found
   */
  const checkForDuplicate = useCallback(async (
    studentId: string,
    questionId: string | undefined,
    ocrText?: string,
    imageDataUrl?: string
  ): Promise<DuplicateCheckResult> => {
    if (!user) {
      return { isDuplicate: false };
    }

    try {
      // Build query for existing attempts by this student
      let query = supabase
        .from('attempts')
        .select(`
          id,
          created_at,
          question_id,
          attempt_images (
            ocr_text,
            image_url
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'analyzed')
        .order('created_at', { ascending: false })
        .limit(20); // Check last 20 attempts

      // If question ID provided, filter by it
      if (questionId) {
        query = query.eq('question_id', questionId);
      }

      const { data: existingAttempts, error } = await query;

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { isDuplicate: false };
      }

      if (!existingAttempts || existingAttempts.length === 0) {
        return { isDuplicate: false };
      }

      // Check each existing attempt for matches
      for (const attempt of existingAttempts) {
        const attemptImages = attempt.attempt_images as Array<{ ocr_text: string | null; image_url: string }>;
        
        if (!attemptImages || attemptImages.length === 0) continue;

        for (const img of attemptImages) {
          // Check OCR text similarity if we have both
          if (ocrText && img.ocr_text) {
            const normalizedNew = normalizeOcrText(ocrText);
            const normalizedExisting = normalizeOcrText(img.ocr_text);
            
            // Exact match check (after normalization)
            if (normalizedNew === normalizedExisting) {
              // Get the grade for this attempt
              const { data: gradeData } = await supabase
                .from('grade_history')
                .select('grade')
                .eq('attempt_id', attempt.id)
                .single();

              return {
                isDuplicate: true,
                existingAttemptId: attempt.id,
                existingGrade: gradeData?.grade,
                matchType: 'exact_ocr',
                createdAt: attempt.created_at,
              };
            }

            // High similarity check (>90% similar content)
            const similarity = calculateSimilarity(ocrText, img.ocr_text);
            if (similarity > 0.90) {
              const { data: gradeData } = await supabase
                .from('grade_history')
                .select('grade')
                .eq('attempt_id', attempt.id)
                .single();

              return {
                isDuplicate: true,
                existingAttemptId: attempt.id,
                existingGrade: gradeData?.grade,
                matchType: 'similar_ocr',
                createdAt: attempt.created_at,
              };
            }
          }

          // Image hash comparison (if we have image data)
          if (imageDataUrl && img.image_url) {
            // Compare hashes of the base64 content
            const newHash = simpleHash(imageDataUrl.slice(0, 5000)); // Hash first 5000 chars for speed
            
            // For stored URLs, we can only compare if it's also a data URL
            if (img.image_url.startsWith('data:')) {
              const existingHash = simpleHash(img.image_url.slice(0, 5000));
              if (newHash === existingHash) {
                const { data: gradeData } = await supabase
                  .from('grade_history')
                  .select('grade')
                  .eq('attempt_id', attempt.id)
                  .single();

                return {
                  isDuplicate: true,
                  existingAttemptId: attempt.id,
                  existingGrade: gradeData?.grade,
                  matchType: 'image_hash',
                  createdAt: attempt.created_at,
                };
              }
            }
          }
        }
      }

      return { isDuplicate: false };
    } catch (err) {
      console.error('Duplicate check error:', err);
      return { isDuplicate: false };
    }
  }, [user]);

  /**
   * Quick check before starting analysis - checks recent attempts
   */
  const quickDuplicateCheck = useCallback(async (
    studentId: string,
    questionId?: string,
    imageDataUrl?: string
  ): Promise<DuplicateCheckResult> => {
    if (!user || !imageDataUrl) {
      return { isDuplicate: false };
    }

    try {
      // Quick hash-based check against recent attempts
      const newHash = simpleHash(imageDataUrl.slice(0, 5000));
      
      // Store hashes in memory for session-level duplicate detection
      const sessionKey = `duplicate_check_${studentId}_${questionId || 'any'}`;
      const sessionHashes = JSON.parse(sessionStorage.getItem(sessionKey) || '[]') as string[];
      
      if (sessionHashes.includes(newHash)) {
        return {
          isDuplicate: true,
          matchType: 'image_hash',
        };
      }

      // Add to session storage
      sessionHashes.push(newHash);
      // Keep only last 50 hashes
      if (sessionHashes.length > 50) {
        sessionHashes.shift();
      }
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionHashes));

      return { isDuplicate: false };
    } catch (err) {
      console.error('Quick duplicate check error:', err);
      return { isDuplicate: false };
    }
  }, [user]);

  /**
   * Clear session-level duplicate tracking (e.g., when starting a new batch)
   */
  const clearDuplicateCache = useCallback(() => {
    // Clear all duplicate check keys from session storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('duplicate_check_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }, []);

  return {
    checkForDuplicate,
    quickDuplicateCheck,
    clearDuplicateCache,
  };
}
