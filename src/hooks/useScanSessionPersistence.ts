import { useState, useEffect, useCallback, useRef } from 'react';

const SCAN_SESSION_KEY = 'scan-genius-single-session';

interface ScanSessionData {
  scanState: string;
  finalImage: string | null;
  singleScanClassId: string | null;
  singleScanStudentId: string | null;
  selectedQuestionIds: string[];
  gradingMode: string;
  resultsSaved: boolean;
  result: any | null;
  teacherGuidedResult: any | null;
  rawAnalysis: string | null;
  answerGuideImage: string | null;
  multiQuestionResults: Record<string, any>;
  currentQuestionIndex: number;
  timestamp: number;
}

/** States worth restoring (user has done meaningful work) */
const PERSISTABLE_STATES = ['choose-method', 'analyzed', 'comparison', 'manual-scoring', 'upload-solution'];

/** Max age for a persisted session: 4 hours */
const MAX_SESSION_AGE_MS = 4 * 60 * 60 * 1000;

export function useScanSessionPersistence() {
  const lastSaved = useRef<string>('');

  const saveSession = useCallback((data: Omit<ScanSessionData, 'timestamp'>) => {
    // Only persist if in a meaningful state
    if (!PERSISTABLE_STATES.includes(data.scanState)) {
      return;
    }
    try {
      const session: ScanSessionData = { ...data, timestamp: Date.now() };
      const serialized = JSON.stringify(session);
      if (serialized !== lastSaved.current) {
        localStorage.setItem(SCAN_SESSION_KEY, serialized);
        lastSaved.current = serialized;
        console.log(`[ScanSession] Saved session in state: ${data.scanState}`);
      }
    } catch (e) {
      console.error('[ScanSession] Failed to save session:', e);
    }
  }, []);

  const loadSession = useCallback((): ScanSessionData | null => {
    try {
      const stored = localStorage.getItem(SCAN_SESSION_KEY);
      if (!stored) return null;
      const parsed: ScanSessionData = JSON.parse(stored);
      
      // Check age
      if (Date.now() - parsed.timestamp > MAX_SESSION_AGE_MS) {
        console.log('[ScanSession] Session expired, clearing');
        localStorage.removeItem(SCAN_SESSION_KEY);
        return null;
      }
      
      // Must have a final image to be useful
      if (!parsed.finalImage && !parsed.result) {
        localStorage.removeItem(SCAN_SESSION_KEY);
        return null;
      }
      
      console.log(`[ScanSession] Loaded session in state: ${parsed.scanState}`);
      return parsed;
    } catch (e) {
      console.error('[ScanSession] Failed to load session:', e);
      localStorage.removeItem(SCAN_SESSION_KEY);
      return null;
    }
  }, []);

  const clearSession = useCallback(() => {
    console.log('[ScanSession] Clearing session');
    localStorage.removeItem(SCAN_SESSION_KEY);
    lastSaved.current = '';
  }, []);

  return { saveSession, loadSession, clearSession };
}
