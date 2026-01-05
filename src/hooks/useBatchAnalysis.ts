import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface RubricStep {
  step_number: number;
  description: string;
  points: number;
}

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface AnalysisResult {
  ocrText: string;
  problemIdentified: string;
  approachAnalysis: string;
  rubricScores: RubricScore[];
  misconceptions: string[];
  totalScore: { earned: number; possible: number; percentage: number };
  feedback: string;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

export interface IdentificationResult {
  qrCodeDetected: boolean;
  qrCodeContent: string | null;
  parsedQRCode?: { studentId: string; questionId: string } | null;
  handwrittenName: string | null;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedQuestionId?: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface BatchItem {
  id: string;
  imageDataUrl: string;
  studentId?: string;
  studentName?: string;
  questionId?: string;
  status: 'pending' | 'identifying' | 'analyzing' | 'completed' | 'failed';
  identification?: IdentificationResult;
  autoAssigned?: boolean;
  result?: AnalysisResult;
  error?: string;
  rawAnalysis?: string;
}

export interface BatchSummary {
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  commonMisconceptions: { misconception: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
}

interface UseBatchAnalysisReturn {
  items: BatchItem[];
  addImage: (imageDataUrl: string, studentId?: string, studentName?: string) => string;
  removeImage: (id: string) => void;
  updateItemStudent: (itemId: string, studentId: string, studentName: string) => void;
  clearAll: () => void;
  autoIdentifyAll: (studentRoster: Student[]) => Promise<void>;
  startBatchAnalysis: (rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string) => Promise<void>;
  isProcessing: boolean;
  isIdentifying: boolean;
  currentIndex: number;
  summary: BatchSummary | null;
  generateSummary: () => BatchSummary;
}

export function useBatchAnalysis(): UseBatchAnalysisReturn {
  const { user } = useAuth();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [summary, setSummary] = useState<BatchSummary | null>(null);

  const addImage = useCallback((imageDataUrl: string, studentId?: string, studentName?: string): string => {
    const id = crypto.randomUUID();
    setItems(prev => [...prev, {
      id,
      imageDataUrl,
      studentId,
      studentName: studentName || undefined,
      status: 'pending',
    }]);
    return id;
  }, []);

  const removeImage = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItemStudent = useCallback((itemId: string, studentId: string, studentName: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, studentId, studentName, autoAssigned: false } : item
    ));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setSummary(null);
    setCurrentIndex(-1);
  }, []);

  const identifyStudent = async (item: BatchItem, studentRoster: Student[]): Promise<BatchItem> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: item.imageDataUrl,
          identifyOnly: true,
          studentRoster: studentRoster.map(s => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            student_id: s.student_id,
          })),
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Identification failed');

      const identification = data.identification as IdentificationResult;
      
      return {
        ...item,
        status: 'pending',
        identification,
        studentId: identification.matchedStudentId || item.studentId,
        studentName: identification.matchedStudentName || item.studentName,
        questionId: identification.matchedQuestionId || item.questionId,
        autoAssigned: !!identification.matchedStudentId,
      };
    } catch (err) {
      console.error('Identification error:', err);
      return {
        ...item,
        status: 'pending',
        identification: {
          qrCodeDetected: false,
          qrCodeContent: null,
          parsedQRCode: null,
          handwrittenName: null,
          matchedStudentId: null,
          matchedStudentName: null,
          matchedQuestionId: null,
          confidence: 'none',
        },
      };
    }
  };

  const autoIdentifyAll = useCallback(async (studentRoster: Student[]) => {
    if (items.length === 0 || isIdentifying || isProcessing) return;
    if (studentRoster.length === 0) return;

    setIsIdentifying(true);

    for (let i = 0; i < items.length; i++) {
      // Skip already assigned items
      if (items[i].studentId) continue;

      setCurrentIndex(i);
      
      // Mark as identifying
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'identifying' } : item
      ));

      const result = await identifyStudent(items[i], studentRoster);

      // Update item with identification result
      setItems(prev => prev.map((item, idx) => 
        idx === i ? result : item
      ));
    }

    setCurrentIndex(-1);
    setIsIdentifying(false);
  }, [items, isIdentifying, isProcessing]);

  const analyzeItem = async (item: BatchItem, rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string): Promise<BatchItem> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: item.imageDataUrl,
          rubricSteps,
          studentName: item.studentName,
          teacherId: user?.id,
          assessmentMode: assessmentMode || 'teacher',
          promptText,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.success || !data?.analysis) throw new Error('Invalid response');

      return {
        ...item,
        status: 'completed',
        result: data.analysis,
        rawAnalysis: data.rawAnalysis,
      };
    } catch (err) {
      return {
        ...item,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Analysis failed',
      };
    }
  };

  const startBatchAnalysis = useCallback(async (rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string) => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setSummary(null);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      
      // Mark current item as analyzing
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'analyzing' } : item
      ));

      const result = await analyzeItem(items[i], rubricSteps, assessmentMode, promptText);

      // Update item with result
      setItems(prev => prev.map((item, idx) => 
        idx === i ? result : item
      ));
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
  }, [items, isProcessing]);

  const generateSummary = useCallback((): BatchSummary => {
    const completedItems = items.filter(item => item.status === 'completed' && item.result);
    
    if (completedItems.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        commonMisconceptions: [],
        scoreDistribution: [],
      };
    }

    const scores = completedItems.map(item => item.result!.totalScore.percentage);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const passRate = Math.round((scores.filter(s => s >= 60).length / scores.length) * 100);

    // Count misconceptions
    const misconceptionCounts: Record<string, number> = {};
    completedItems.forEach(item => {
      item.result!.misconceptions.forEach(m => {
        misconceptionCounts[m] = (misconceptionCounts[m] || 0) + 1;
      });
    });
    const commonMisconceptions = Object.entries(misconceptionCounts)
      .map(([misconception, count]) => ({ misconception, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Score distribution
    const ranges = [
      { range: '0-59%', min: 0, max: 59 },
      { range: '60-69%', min: 60, max: 69 },
      { range: '70-79%', min: 70, max: 79 },
      { range: '80-89%', min: 80, max: 89 },
      { range: '90-100%', min: 90, max: 100 },
    ];
    const scoreDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: scores.filter(s => s >= min && s <= max).length,
    }));

    const newSummary = {
      totalStudents: completedItems.length,
      averageScore,
      highestScore,
      lowestScore,
      passRate,
      commonMisconceptions,
      scoreDistribution,
    };

    setSummary(newSummary);
    return newSummary;
  }, [items]);

  return {
    items,
    addImage,
    removeImage,
    updateItemStudent,
    clearAll,
    autoIdentifyAll,
    startBatchAnalysis,
    isProcessing,
    isIdentifying,
    currentIndex,
    summary,
    generateSummary,
  };
}
