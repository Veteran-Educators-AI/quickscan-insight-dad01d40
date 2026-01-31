import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/apiErrorHandler';
import { useQRScanSettings } from '@/hooks/useQRScanSettings';
import { useDuplicateWorkDetection } from '@/hooks/useDuplicateWorkDetection';
import jsQR from 'jsqr';
import { parseStudentQRCode } from '@/components/print/StudentQRCode';
import { parseAnyStudentQRCode } from '@/components/print/StudentOnlyQRCode';
import { toast } from 'sonner';

const BATCH_STORAGE_KEY = 'scan-genius-batch-data';
const BATCH_SUMMARY_KEY = 'scan-genius-batch-summary';

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
  grade?: number;
  gradeJustification?: string;
  nysStandard?: string;
  regentsScore?: number;
  regentsScoreJustification?: string;
  // Multi-analysis confidence fields
  multiAnalysisGrades?: number[];
  multiAnalysisResults?: AnalysisResult[]; // Full breakdown of each analysis run
  confidenceScore?: number; // 0-100 based on grade consistency
  isOverridden?: boolean;
  overriddenGrade?: number;
  overrideJustification?: string;
  selectedRunIndex?: number; // Index of manually selected run (instead of average)
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
  parsedQRCode?: { studentId: string; questionId?: string; type?: 'student-only' | 'student-question' } | null;
  handwrittenName: string | null;
  matchedStudentId: string | null;
  matchedStudentName: string | null;
  matchedQuestionId?: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface HandwritingSimilarity {
  isSameStudent: boolean;
  confidence: 'high' | 'medium' | 'low';
  similarityScore: number;
  reasoning: string;
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
  // Multi-page paper support
  pageType?: 'new' | 'continuation';
  continuationOf?: string; // ID of the primary page this is a continuation of
  continuationPages?: string[]; // IDs of pages that are continuations of this paper
  // Handwriting similarity info
  handwritingSimilarity?: HandwritingSimilarity;
  // Flag when a continuation is converted to separate paper for individual grading
  wasConvertedFromContinuation?: boolean;
  // Filename for grouping multi-page papers by topic
  filename?: string;
  worksheetTopic?: string; // Parsed topic name from filename (for grouping)
  // Multi-page averaging
  isAveragedResult?: boolean; // True if this result is averaged from multiple papers
  averagedFromIds?: string[]; // IDs of items that were averaged together
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
  addImage: (imageDataUrl: string, studentId?: string, studentName?: string, filename?: string) => string;
  addImageWithAutoIdentify: (imageDataUrl: string, studentRoster?: Student[]) => Promise<string>;
  addPdfPagesWithAutoGrouping: (
    pages: string[],
    studentRoster: Student[],
    onProgress?: (current: number, total: number, status: string) => void
  ) => Promise<{ pagesAdded: number; studentsIdentified: number; pagesLinked: number }>;
  removeImage: (id: string) => void;
  updateItemStudent: (itemId: string, studentId: string, studentName: string) => void;
  reorderItems: (activeId: string, overId: string) => void;
  clearAll: () => void;
  autoIdentifyAll: (studentRoster: Student[]) => Promise<void>;
  scanAllQRCodes: (studentRoster: Student[]) => Promise<{ matched: number; total: number }>;
  detectPageTypes: () => Promise<{ newPapers: number; continuations: number }>;
  detectMultiPageByHandwriting: () => Promise<{ groupsCreated: number; pagesLinked: number }>;
  groupPagesByStudent: () => { studentsGrouped: number; pagesLinked: number };
  groupPagesByWorksheetTopic: () => { topicsGrouped: number; pagesLinked: number };
  linkContinuation: (continuationId: string, primaryId: string) => void;
  unlinkContinuation: (continuationId: string) => void;
  unlinkAllPages: () => void;
  convertToSeparatePaper: (itemId: string) => void;
  startBatchAnalysis: (rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string, answerGuideImage?: string, useLearnedStyle?: boolean) => Promise<void>;
  startConfidenceAnalysis: (analysisCount: 2 | 3, rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string) => Promise<void>;
  startTeacherGuidedBatchAnalysis: (answerGuideImage: string, rubricSteps?: RubricStep[]) => Promise<void>;
  reanalyzeItem: (itemId: string, rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string) => Promise<BatchItem | null>;
  overrideGrade: (itemId: string, newGrade: number, justification: string) => void;
  selectRunAsGrade: (itemId: string, runIndex: number) => void;
  isProcessing: boolean;
  isIdentifying: boolean;
  isRestoredFromStorage: boolean;
  currentIndex: number;
  summary: BatchSummary | null;
  generateSummary: () => BatchSummary;
}

export function useBatchAnalysis(): UseBatchAnalysisReturn {
  const { user } = useAuth();
  const { settings: qrScanSettings } = useQRScanSettings();
  const { checkForDuplicate, quickDuplicateCheck, clearDuplicateCache } = useDuplicateWorkDetection();
  const hasLoadedFromStorage = useRef(false);
  const lastSavedItems = useRef<string>('');
  const lastSavedSummary = useRef<string>('');
  
  // Load initial state from localStorage
  const [items, setItems] = useState<BatchItem[]>(() => {
    try {
      const stored = localStorage.getItem(BATCH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[BatchAnalysis] Restored ${parsed.length} items from session`);
          hasLoadedFromStorage.current = true;
          lastSavedItems.current = stored;
          return parsed;
        }
      }
    } catch (e) {
      console.error('[BatchAnalysis] Failed to restore batch data:', e);
    }
    return [];
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  // Load summary from localStorage
  const [summary, setSummary] = useState<BatchSummary | null>(() => {
    try {
      const storedSummary = localStorage.getItem(BATCH_SUMMARY_KEY);
      if (storedSummary) {
        const parsed = JSON.parse(storedSummary);
        console.log('[BatchAnalysis] Restored summary from session');
        lastSavedSummary.current = storedSummary;
        return parsed;
      }
    } catch (e) {
      console.error('[BatchAnalysis] Failed to restore summary:', e);
    }
    return null;
  });

  // Persist items to localStorage when they change - use JSON comparison to avoid unnecessary writes
  useEffect(() => {
    try {
      const serialized = items.length > 0 ? JSON.stringify(items) : '';
      
      // Only write if the data actually changed
      if (serialized !== lastSavedItems.current) {
        if (items.length > 0) {
          console.log(`[BatchAnalysis] Persisting ${items.length} items to localStorage`);
          localStorage.setItem(BATCH_STORAGE_KEY, serialized);
          lastSavedItems.current = serialized;
        } else if (lastSavedItems.current !== '') {
          // Only clear if we previously had data (prevents clearing on initial empty load)
          console.log('[BatchAnalysis] Clearing items from localStorage');
          localStorage.removeItem(BATCH_STORAGE_KEY);
          localStorage.removeItem(BATCH_SUMMARY_KEY);
          lastSavedItems.current = '';
          lastSavedSummary.current = '';
        }
      }
    } catch (e) {
      console.error('[BatchAnalysis] Failed to persist batch data:', e);
    }
  }, [items]);

  // Persist summary to localStorage when it changes
  useEffect(() => {
    try {
      const serialized = summary ? JSON.stringify(summary) : '';
      
      if (serialized !== lastSavedSummary.current) {
        if (summary) {
          console.log('[BatchAnalysis] Persisting summary to localStorage');
          localStorage.setItem(BATCH_SUMMARY_KEY, serialized);
          lastSavedSummary.current = serialized;
        } else if (lastSavedSummary.current !== '') {
          console.log('[BatchAnalysis] Clearing summary from localStorage');
          localStorage.removeItem(BATCH_SUMMARY_KEY);
          lastSavedSummary.current = '';
        }
      }
    } catch (e) {
      console.error('[BatchAnalysis] Failed to persist summary:', e);
    }
  }, [summary]);

  // Auto-regenerate summary on mount if we have completed items but no summary
  useEffect(() => {
    const completedItems = items.filter(item => item.status === 'completed' && item.result);
    if (completedItems.length > 0 && !summary) {
      console.log('Auto-regenerating summary for restored items');
      // Delay to ensure state is fully initialized
      setTimeout(() => {
        const validScores = completedItems
          .map(item => item.result?.grade ?? item.result?.totalScore?.percentage)
          .filter((s): s is number => typeof s === 'number' && !isNaN(s));

        if (validScores.length > 0) {
          const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
          const highScore = Math.max(...validScores);
          const lowScore = Math.min(...validScores);
          const passCount = validScores.filter(s => s >= 65).length;
          
          const misconceptionCounts: Record<string, number> = {};
          completedItems.forEach(item => {
            (item.result?.misconceptions || []).forEach(m => {
              misconceptionCounts[m] = (misconceptionCounts[m] || 0) + 1;
            });
          });
          
          const ranges = [
            { range: '0-59%', min: 0, max: 59 },
            { range: '60-69%', min: 60, max: 69 },
            { range: '70-79%', min: 70, max: 79 },
            { range: '80-89%', min: 80, max: 89 },
            { range: '90-100%', min: 90, max: 100 },
          ];
          
          setSummary({
            totalStudents: completedItems.length,
            averageScore: Math.round(avgScore * 10) / 10,
            highestScore: highScore,
            lowestScore: lowScore,
            passRate: Math.round((passCount / validScores.length) * 100),
            commonMisconceptions: Object.entries(misconceptionCounts)
              .map(([misconception, count]) => ({ misconception, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5),
            scoreDistribution: ranges.map(({ range, min, max }) => ({
              range,
              count: validScores.filter(s => s >= min && s <= max).length,
            })),
          });
        }
      }, 100);
    }
  }, []); // Only run on mount

  // Apply grade curve to a result
  const applyGradeCurve = useCallback((result: AnalysisResult): AnalysisResult => {
    const curvePercent = qrScanSettings.gradeCurvePercent || 0;
    if (curvePercent <= 0) return result;

    const newPercentage = Math.min(100, result.totalScore.percentage + curvePercent);
    const newGrade = result.grade ? Math.min(100, result.grade + curvePercent) : undefined;

    return {
      ...result,
      totalScore: {
        ...result.totalScore,
        percentage: newPercentage,
      },
      grade: newGrade,
      gradeJustification: result.gradeJustification 
        ? `${result.gradeJustification} (Grade curved +${curvePercent}%)`
        : `Grade curved +${curvePercent}%`,
    };
  }, [qrScanSettings.gradeCurvePercent]);

  // Parse worksheet topic from filename (removes extension, page numbers, cleans up)
  const parseWorksheetTopic = useCallback((filename: string): string => {
    if (!filename) return '';
    // Remove file extension
    let name = filename.replace(/\.[^/.]+$/, '');
    // Remove page numbers like _0001, _0002, (1), (2), -page1, page 2, etc.
    name = name.replace(/[_\-\s]*(page\s*)?\d{1,4}$/i, '');
    name = name.replace(/\(\d+\)$/, '');
    name = name.replace(/_+$/, '');
    // Replace underscores with spaces
    name = name.replace(/_/g, ' ');
    // Clean up multiple spaces
    name = name.replace(/\s+/g, ' ').trim();
    return name.toLowerCase() || filename.toLowerCase();
  }, []);

  const addImage = useCallback((imageDataUrl: string, studentId?: string, studentName?: string, filename?: string): string => {
    const id = crypto.randomUUID();
    const worksheetTopic = filename ? parseWorksheetTopic(filename) : undefined;
    const newItem: BatchItem = {
      id,
      imageDataUrl,
      studentId,
      studentName: studentName || undefined,
      status: 'pending',
      filename,
      worksheetTopic,
    };
    setItems(prev => [...prev, newItem]);
    return id;
  }, [parseWorksheetTopic]);

  // Auto-identify a single newly added image
  const autoIdentifySingle = useCallback(async (itemId: string, studentRoster: Student[]) => {
    if (studentRoster.length === 0) return;

    // Mark as identifying
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: 'identifying' } : item
    ));

    const item = items.find(i => i.id === itemId) || { id: itemId, imageDataUrl: '', status: 'pending' as const };
    
    // We need to get the item from current state, use a ref pattern or fetch from latest
    setItems(prev => {
      const currentItem = prev.find(i => i.id === itemId);
      if (!currentItem) return prev;
      
      // Start async identification
      (async () => {
        const result = await identifyStudent(currentItem, studentRoster);
        setItems(p => p.map(i => i.id === itemId ? result : i));
      })();
      
      return prev;
    });
  }, []);

  // Add image and auto-identify if roster provided
  const addImageWithAutoIdentify = useCallback(async (imageDataUrl: string, studentRoster?: Student[]): Promise<string> => {
    const id = crypto.randomUUID();
    const newItem: BatchItem = {
      id,
      imageDataUrl,
      status: studentRoster && studentRoster.length > 0 ? 'identifying' : 'pending',
    };
    
    setItems(prev => [...prev, newItem]);

    // Auto-identify if roster is provided
    if (studentRoster && studentRoster.length > 0) {
      try {
        const result = await identifyStudent(newItem, studentRoster);
        setItems(prev => prev.map(item => item.id === id ? result : item));
      } catch (err) {
        console.error('Auto-identify failed:', err);
        setItems(prev => prev.map(item => 
          item.id === id ? { ...item, status: 'pending' } : item
        ));
      }
    }

    return id;
  }, []);

  // Add multiple PDF pages with automatic student separation based on handwriting/name detection
  const addPdfPagesWithAutoGrouping = useCallback(async (
    pages: string[],
    studentRoster: Student[],
    onProgress?: (current: number, total: number, status: string) => void
  ): Promise<{ pagesAdded: number; studentsIdentified: number; pagesLinked: number }> => {
    if (pages.length === 0) return { pagesAdded: 0, studentsIdentified: 0, pagesLinked: 0 };

    setIsIdentifying(true);
    
    // Structure to track student groups as we process pages
    interface StudentGroup {
      primaryId: string;
      studentId?: string;
      studentName?: string;
      pageIds: string[];
    }
    
    const studentGroups: StudentGroup[] = [];
    let currentGroup: StudentGroup | null = null;
    let studentsIdentified = 0;
    let pagesLinked = 0;
    const newItems: BatchItem[] = [];

    for (let i = 0; i < pages.length; i++) {
      const pageDataUrl = pages[i];
      const pageId = crypto.randomUUID();
      
      onProgress?.(i + 1, pages.length, i === 0 ? 'Identifying first student...' : 'Comparing handwriting...');
      
      // Create base item
      const baseItem: BatchItem = {
        id: pageId,
        imageDataUrl: pageDataUrl,
        status: 'pending',
      };
      
      if (i === 0) {
        // First page - always identify student
        try {
          const identResult = await identifyStudent(baseItem, studentRoster);
          
          currentGroup = {
            primaryId: pageId,
            studentId: identResult.studentId,
            studentName: identResult.studentName,
            pageIds: [pageId],
          };
          
          if (identResult.studentId) studentsIdentified++;
          
          newItems.push({
            ...identResult,
            pageType: 'new',
          });
          studentGroups.push(currentGroup);
        } catch (err) {
          console.error('First page identification failed:', err);
          currentGroup = {
            primaryId: pageId,
            pageIds: [pageId],
          };
          newItems.push({
            ...baseItem,
            pageType: 'new',
          });
          studentGroups.push(currentGroup);
        }
      } else {
        // Subsequent pages - check handwriting similarity with previous page
        const previousItem = newItems[i - 1];
        
        try {
          const { data, error } = await supabase.functions.invoke('detect-handwriting-similarity', {
            body: {
              image1Base64: previousItem.imageDataUrl,
              image2Base64: pageDataUrl,
            },
          });

          if (!error && data?.success && data?.similarity) {
            const similarity = data.similarity;
            
            const handwritingSimilarity: HandwritingSimilarity = {
              isSameStudent: similarity.isSameStudent,
              confidence: similarity.confidence,
              similarityScore: similarity.similarityScore,
              reasoning: similarity.reasoning,
            };
            
            if (similarity.isSameStudent && (similarity.confidence === 'high' || similarity.confidence === 'medium')) {
              // Same student - link as continuation
              pagesLinked++;
              currentGroup!.pageIds.push(pageId);
              
              newItems.push({
                ...baseItem,
                pageType: 'continuation',
                continuationOf: currentGroup!.primaryId,
                handwritingSimilarity,
                studentId: currentGroup!.studentId,
                studentName: currentGroup!.studentName,
                autoAssigned: !!currentGroup!.studentId,
              });
            } else {
              // Different student - start new group
              onProgress?.(i + 1, pages.length, 'New student detected, identifying...');
              
              try {
                const identResult = await identifyStudent(baseItem, studentRoster);
                
                currentGroup = {
                  primaryId: pageId,
                  studentId: identResult.studentId,
                  studentName: identResult.studentName,
                  pageIds: [pageId],
                };
                
                if (identResult.studentId) studentsIdentified++;
                
                newItems.push({
                  ...identResult,
                  pageType: 'new',
                  handwritingSimilarity,
                });
                studentGroups.push(currentGroup);
              } catch (err) {
                console.error('Student identification failed:', err);
                currentGroup = {
                  primaryId: pageId,
                  pageIds: [pageId],
                };
                newItems.push({
                  ...baseItem,
                  pageType: 'new',
                  handwritingSimilarity,
                });
                studentGroups.push(currentGroup);
              }
            }
          } else {
            // Handwriting comparison failed - try to identify as new student
            onProgress?.(i + 1, pages.length, 'Identifying student...');
            
            try {
              const identResult = await identifyStudent(baseItem, studentRoster);
              
              // Check if this matches the current group's student
              if (currentGroup?.studentId && identResult.studentId === currentGroup.studentId) {
                // Same student by name - link as continuation
                pagesLinked++;
                currentGroup.pageIds.push(pageId);
                
                newItems.push({
                  ...identResult,
                  pageType: 'continuation',
                  continuationOf: currentGroup.primaryId,
                });
              } else if (identResult.studentId) {
                // Different student
                studentsIdentified++;
                currentGroup = {
                  primaryId: pageId,
                  studentId: identResult.studentId,
                  studentName: identResult.studentName,
                  pageIds: [pageId],
                };
                
                newItems.push({
                  ...identResult,
                  pageType: 'new',
                });
                studentGroups.push(currentGroup);
              } else {
                // Could not identify - assume new paper
                currentGroup = {
                  primaryId: pageId,
                  pageIds: [pageId],
                };
                newItems.push({
                  ...identResult,
                  pageType: 'new',
                });
                studentGroups.push(currentGroup);
              }
            } catch (err) {
              // Fallback - add as new paper
              currentGroup = {
                primaryId: pageId,
                pageIds: [pageId],
              };
              newItems.push({
                ...baseItem,
                pageType: 'new',
              });
              studentGroups.push(currentGroup);
            }
          }
        } catch (err) {
          console.error('Handwriting comparison failed:', err);
          // Fallback - try identification
          try {
            const identResult = await identifyStudent(baseItem, studentRoster);
            if (identResult.studentId) studentsIdentified++;
            currentGroup = {
              primaryId: pageId,
              studentId: identResult.studentId,
              studentName: identResult.studentName,
              pageIds: [pageId],
            };
            newItems.push({
              ...identResult,
              pageType: 'new',
            });
            studentGroups.push(currentGroup);
          } catch (e) {
            currentGroup = {
              primaryId: pageId,
              pageIds: [pageId],
            };
            newItems.push({
              ...baseItem,
              pageType: 'new',
            });
            studentGroups.push(currentGroup);
          }
        }
      }
    }

    // Update continuation pages lists for primary items
    const finalItems = newItems.map(item => {
      if (item.pageType === 'new') {
        const group = studentGroups.find(g => g.primaryId === item.id);
        if (group && group.pageIds.length > 1) {
          return {
            ...item,
            continuationPages: group.pageIds.slice(1),
          };
        }
      }
      return item;
    });

    // Add all items to the batch
    setItems(prev => [...prev, ...finalItems]);
    setIsIdentifying(false);

    return {
      pagesAdded: pages.length,
      studentsIdentified,
      pagesLinked,
    };
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
    console.log('[BatchAnalysis] Clearing all data');
    setItems([]);
    setSummary(null);
    setCurrentIndex(-1);
    // Clear persisted data explicitly
    try {
      localStorage.removeItem(BATCH_STORAGE_KEY);
      localStorage.removeItem(BATCH_SUMMARY_KEY);
      lastSavedItems.current = '';
      lastSavedSummary.current = '';
    } catch (e) {
      console.error('[BatchAnalysis] Failed to clear batch data:', e);
    }
    // Clear duplicate detection cache for fresh batch
    clearDuplicateCache();
  }, [clearDuplicateCache]);

  // Local QR code scanning function - supports both student-only and student+question QR codes
  const scanQRCodeFromImage = async (imageDataUrl: string): Promise<{ studentId: string; questionId?: string; type: 'student-only' | 'student-question' } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        // Calculate region sizes based on image dimensions
        // QR codes are 70-80px with borders, so look for appropriately sized regions
        const cornerSize = Math.max(200, Math.min(500, Math.floor(img.width / 2.5)));
        const edgeWidth = Math.max(150, Math.min(400, Math.floor(img.width / 3)));
        
        // Try scanning different regions - TOP-RIGHT FIRST (where student QR is placed)
        // Order matters: most common locations first for performance
        const regions = [
          // TOP-RIGHT CORNER (PRIMARY - this is where StudentOnlyQRCode is placed on worksheets)
          { x: Math.max(0, img.width - cornerSize), y: 0, w: cornerSize, h: cornerSize },
          // Top edge full width (header area - catches QR even if slightly off)
          { x: 0, y: 0, w: img.width, h: Math.min(400, img.height / 3) },
          // Top-left corner (for question QRs)
          { x: 0, y: 0, w: cornerSize, h: cornerSize },
          // Right edge full height (catches QR if page slightly rotated)
          { x: Math.max(0, img.width - edgeWidth), y: 0, w: edgeWidth, h: img.height },
          // Upper half of image (most QRs are in top portion)
          { x: 0, y: 0, w: img.width, h: Math.floor(img.height / 2) },
          // Bottom corners (legacy support)
          { x: Math.max(0, img.width - cornerSize), y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
          { x: 0, y: Math.max(0, img.height - cornerSize), w: cornerSize, h: cornerSize },
          // Full image (final fallback)
          { x: 0, y: 0, w: img.width, h: img.height },
        ];

        for (const region of regions) {
          try {
            const imageData = ctx.getImageData(region.x, region.y, region.w, region.h);
            // Use inversionAttempts for better detection in varied lighting conditions
            const code = jsQR(imageData.data, region.w, region.h, {
              inversionAttempts: 'attemptBoth',
            });
            
            if (code) {
              // Try unified parser first (handles both v1 and v2)
              const unified = parseAnyStudentQRCode(code.data);
              if (unified) {
                resolve(unified);
                return;
              }
              
              // Fallback to legacy parser
              const parsed = parseStudentQRCode(code.data);
              if (parsed) {
                resolve({ ...parsed, type: 'student-question' });
                return;
              }
            }
          } catch (e) {
            // Continue to next region
          }
        }

        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = imageDataUrl;
    });
  };

  // Batch QR code scanning - fast local scanning
  const scanAllQRCodes = useCallback(async (studentRoster: Student[]): Promise<{ matched: number; total: number }> => {
    if (items.length === 0 || isIdentifying || isProcessing) {
      return { matched: 0, total: 0 };
    }

    setIsIdentifying(true);
    let matchedCount = 0;

    for (let i = 0; i < items.length; i++) {
      // Skip already assigned items with high confidence
      if (items[i].identification?.confidence === 'high' && items[i].studentId) {
        matchedCount++;
        continue;
      }

      setCurrentIndex(i);
      
      // Mark as identifying
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'identifying' } : item
      ));

      // Try local QR scan first (fast)
      const qrResult = await scanQRCodeFromImage(items[i].imageDataUrl);
      
      if (qrResult) {
        // Find matching student from roster
        const matchedStudent = studentRoster.find(s => s.id === qrResult.studentId);
        
        if (matchedStudent) {
          matchedCount++;
          setItems(prev => prev.map((item, idx) => 
            idx === i ? {
              ...item,
              status: 'pending',
              studentId: matchedStudent.id,
              studentName: `${matchedStudent.first_name} ${matchedStudent.last_name}`,
              questionId: qrResult.questionId,
              autoAssigned: true,
              identification: {
                qrCodeDetected: true,
                qrCodeContent: JSON.stringify(qrResult),
                parsedQRCode: qrResult,
                handwrittenName: null,
                matchedStudentId: matchedStudent.id,
                matchedStudentName: `${matchedStudent.first_name} ${matchedStudent.last_name}`,
                matchedQuestionId: qrResult.questionId,
                confidence: 'high',
              },
            } : item
          ));
        } else {
          // QR detected but student not in roster
          setItems(prev => prev.map((item, idx) => 
            idx === i ? {
              ...item,
              status: 'pending',
              questionId: qrResult.questionId,
              identification: {
                qrCodeDetected: true,
                qrCodeContent: JSON.stringify(qrResult),
                parsedQRCode: qrResult,
                handwrittenName: null,
                matchedStudentId: null,
                matchedStudentName: null,
                matchedQuestionId: qrResult.questionId,
                confidence: 'low',
              },
            } : item
          ));
        }
      } else {
        // No QR found, mark as pending
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'pending' } : item
        ));
      }
    }

    setCurrentIndex(-1);
    setIsIdentifying(false);
    
    return { matched: matchedCount, total: items.length };
  }, [items, isIdentifying, isProcessing]);

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
      // Check for duplicate work before spending AI credits
      if (item.studentId && item.questionId) {
        const duplicateCheck = await checkForDuplicate(
          item.studentId,
          item.questionId,
          undefined, // We don't have OCR text yet
          item.imageDataUrl
        );

        if (duplicateCheck.isDuplicate) {
          const gradeInfo = duplicateCheck.existingGrade 
            ? `${duplicateCheck.existingGrade}%` 
            : 'recorded';
          toast.info(
            `Skipping duplicate: ${item.studentName || 'Student'}'s work already analyzed (${gradeInfo})`,
            { duration: 3000 }
          );
          return {
            ...item,
            status: 'completed',
            result: {
              ocrText: '',
              problemIdentified: 'Duplicate work - previously analyzed',
              approachAnalysis: 'This work was already analyzed in a previous scan.',
              rubricScores: [],
              misconceptions: [],
              totalScore: { 
                earned: duplicateCheck.existingGrade ? Math.round(duplicateCheck.existingGrade / 10) : 0, 
                possible: 10, 
                percentage: duplicateCheck.existingGrade || 0 
              },
              feedback: `This work was already analyzed${duplicateCheck.createdAt ? ` on ${new Date(duplicateCheck.createdAt).toLocaleDateString()}` : ''}.`,
              grade: duplicateCheck.existingGrade,
              gradeJustification: 'Duplicate submission - using previous grade',
            },
          };
        }
      }

      // Quick session-level duplicate check (catches rescans in same session)
      const quickCheck = await quickDuplicateCheck(
        item.studentId || 'unknown',
        item.questionId,
        item.imageDataUrl
      );

      if (quickCheck.isDuplicate) {
        toast.info(
          `Skipping: Same image already processed this session`,
          { duration: 2000 }
        );
        return {
          ...item,
          status: 'failed',
          error: 'Duplicate image in this batch - already processed',
        };
      }

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

      if (error) {
        const errorMsg = handleApiError(error, 'Analysis');
        throw new Error(errorMsg);
      }
      if (data?.error) {
        const errorMsg = handleApiError({ message: data.error }, 'Analysis');
        throw new Error(errorMsg);
      }
      if (!data?.success || !data?.analysis) throw new Error('Invalid response');

      // Apply grade curve if configured
      const curvedAnalysis = applyGradeCurve(data.analysis);

      return {
        ...item,
        status: 'completed',
        result: curvedAnalysis,
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

  // Detect page types for all items (new paper vs continuation)
  const detectPageTypes = useCallback(async (): Promise<{ newPapers: number; continuations: number }> => {
    if (items.length === 0 || isProcessing || isIdentifying) {
      return { newPapers: 0, continuations: 0 };
    }

    setIsIdentifying(true);
    let newPapers = 0;
    let continuations = 0;
    let lastNewPaperId: string | null = null;

    for (let i = 0; i < items.length; i++) {
      // Skip items already marked
      if (items[i].pageType) {
        if (items[i].pageType === 'new') {
          lastNewPaperId = items[i].id;
          newPapers++;
        } else {
          continuations++;
        }
        continue;
      }

      setCurrentIndex(i);
      
      // Mark as identifying
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'identifying' } : item
      ));

      try {
        const { data, error } = await supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: items[i].imageDataUrl,
            detectPageType: true,
          },
        });

        if (!error && data?.success && data?.pageType) {
          const isNew = data.pageType.isNewPaper && !data.pageType.isContinuation;
          
          if (isNew) {
            newPapers++;
            lastNewPaperId = items[i].id;
            setItems(prev => prev.map((item, idx) => 
              idx === i ? { 
                ...item, 
                status: 'pending',
                pageType: 'new',
                continuationOf: undefined,
              } : item
            ));
          } else {
            continuations++;
            // Link to the most recent "new" paper
            setItems(prev => {
              const updated: BatchItem[] = prev.map((item, idx) => {
                if (idx === i) {
                  return { 
                    ...item, 
                    status: 'pending' as const,
                    pageType: 'continuation' as const,
                    continuationOf: lastNewPaperId || undefined,
                  };
                }
                // Add this as a continuation page to the primary paper
                if (lastNewPaperId && item.id === lastNewPaperId) {
                  return {
                    ...item,
                    continuationPages: [...(item.continuationPages || []), items[i].id],
                  };
                }
                return item;
              });
              return updated;
            });
          }
        } else {
          // Default to new paper if detection fails
          newPapers++;
          lastNewPaperId = items[i].id;
          setItems(prev => prev.map((item, idx) => 
            idx === i ? { ...item, status: 'pending', pageType: 'new' } : item
          ));
        }
      } catch (err) {
        console.error('Page type detection failed:', err);
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'pending', pageType: 'new' } : item
        ));
        newPapers++;
        lastNewPaperId = items[i].id;
      }
    }

    setCurrentIndex(-1);
    setIsIdentifying(false);
    
    return { newPapers, continuations };
  }, [items, isProcessing, isIdentifying]);

  // Detect multi-page papers using handwriting similarity between sequential pages
  const detectMultiPageByHandwriting = useCallback(async (): Promise<{ groupsCreated: number; pagesLinked: number }> => {
    if (items.length < 2 || isProcessing || isIdentifying) {
      return { groupsCreated: 0, pagesLinked: 0 };
    }

    setIsIdentifying(true);
    let groupsCreated = 0;
    let pagesLinked = 0;
    let lastNewPaperId: string | null = null;

    // First pass: identify pages with students already assigned
    const itemsWithStudents = items.map((item, idx) => ({
      ...item,
      originalIndex: idx,
      hasStudent: !!(item.studentId || item.identification?.matchedStudentId),
    }));

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[i];
      
      // If this is the first item or has a student assigned, treat as new paper
      if (i === 0 || currentItem.studentId || currentItem.identification?.matchedStudentId) {
        lastNewPaperId = currentItem.id;
        groupsCreated++;
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, pageType: 'new' as const } : item
        ));
        continue;
      }

      // If no previous paper to link to, mark as new
      if (!lastNewPaperId) {
        lastNewPaperId = currentItem.id;
        groupsCreated++;
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, pageType: 'new' as const } : item
        ));
        continue;
      }

      setCurrentIndex(i);
      
      // Mark as identifying
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'identifying' } : item
      ));

      // Get the previous item (the one we're comparing to)
      const previousItem = items[i - 1];

      try {
        // Compare handwriting between this page and the previous one
        const { data, error } = await supabase.functions.invoke('detect-handwriting-similarity', {
          body: {
            image1Base64: previousItem.imageDataUrl,
            image2Base64: currentItem.imageDataUrl,
          },
        });

        if (!error && data?.success && data?.similarity) {
          const similarity = data.similarity;
          
          // Store similarity info
          const handwritingSimilarity: HandwritingSimilarity = {
            isSameStudent: similarity.isSameStudent,
            confidence: similarity.confidence,
            similarityScore: similarity.similarityScore,
            reasoning: similarity.reasoning,
          };

          if (similarity.isSameStudent && (similarity.confidence === 'high' || similarity.confidence === 'medium')) {
            // Link as continuation to the previous paper's primary
            const primaryId = previousItem.pageType === 'continuation' && previousItem.continuationOf 
              ? previousItem.continuationOf 
              : previousItem.id;
            
            pagesLinked++;
            
            setItems(prev => {
              const updated: BatchItem[] = prev.map((item, idx) => {
                if (idx === i) {
                  return { 
                    ...item, 
                    status: 'pending' as const,
                    pageType: 'continuation' as const,
                    continuationOf: primaryId,
                    handwritingSimilarity,
                    // Inherit student from primary if available
                    studentId: prev.find(p => p.id === primaryId)?.studentId,
                    studentName: prev.find(p => p.id === primaryId)?.studentName,
                  };
                }
                // Add this as a continuation page to the primary paper
                if (item.id === primaryId) {
                  return {
                    ...item,
                    continuationPages: [...(item.continuationPages || []), currentItem.id],
                  };
                }
                return item;
              });
              return updated;
            });
          } else {
            // Different student - mark as new paper
            lastNewPaperId = currentItem.id;
            groupsCreated++;
            setItems(prev => prev.map((item, idx) => 
              idx === i ? { 
                ...item, 
                status: 'pending' as const, 
                pageType: 'new' as const,
                handwritingSimilarity,
              } : item
            ));
          }
        } else {
          // API error - default to new paper
          lastNewPaperId = currentItem.id;
          groupsCreated++;
          setItems(prev => prev.map((item, idx) => 
            idx === i ? { ...item, status: 'pending', pageType: 'new' } : item
          ));
        }
      } catch (err) {
        console.error('Handwriting similarity detection failed:', err);
        lastNewPaperId = currentItem.id;
        groupsCreated++;
        setItems(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'pending', pageType: 'new' } : item
        ));
      }
    }

    setCurrentIndex(-1);
    setIsIdentifying(false);
    
    return { groupsCreated, pagesLinked };
  }, [items, isProcessing, isIdentifying]);

  // Manually link a continuation page to a primary paper
  const linkContinuation = useCallback((continuationId: string, primaryId: string) => {
    setItems(prev => {
      return prev.map(item => {
        if (item.id === continuationId) {
          return { ...item, pageType: 'continuation', continuationOf: primaryId };
        }
        if (item.id === primaryId) {
          const existingContinuations = item.continuationPages || [];
          if (!existingContinuations.includes(continuationId)) {
            return { ...item, continuationPages: [...existingContinuations, continuationId] };
          }
        }
        return item;
      });
    });
  }, []);

  // Unlink a continuation page
  const unlinkContinuation = useCallback((continuationId: string) => {
    setItems(prev => {
      const continuationItem = prev.find(i => i.id === continuationId);
      const primaryId = continuationItem?.continuationOf;
      
      return prev.map(item => {
        if (item.id === continuationId) {
          return { ...item, pageType: 'new', continuationOf: undefined };
        }
        if (primaryId && item.id === primaryId) {
          return { 
            ...item, 
            continuationPages: (item.continuationPages || []).filter(id => id !== continuationId) 
          };
        }
        return item;
      });
    });
  }, []);

  // Unlink ALL pages - reset all linking
  const unlinkAllPages = useCallback(() => {
    setItems(prev => 
      prev.map(item => ({
        ...item,
        pageType: 'new',
        continuationOf: undefined,
        continuationPages: undefined,
      }))
    );
  }, []);

  // Convert a continuation page to a separate paper (keeps it as 'new' and clears continuation info)
  // This allows it to be saved to gradebook independently
  const convertToSeparatePaper = useCallback((itemId: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId);
      const primaryId = item?.continuationOf;
      
      return prev.map(it => {
        if (it.id === itemId) {
          // Convert to separate paper - mark as 'new' so it can be saved
          return { 
            ...it, 
            pageType: 'new', 
            continuationOf: undefined,
            // Mark it as converted so we know it was originally a continuation
            wasConvertedFromContinuation: true,
          };
        }
        if (primaryId && it.id === primaryId) {
          // Remove from primary's continuation list
          return { 
            ...it, 
            continuationPages: (it.continuationPages || []).filter(id => id !== itemId) 
          };
        }
        return it;
      });
    });
  }, []);

  // Group pages by the same student - automatically links front/back pages
  const groupPagesByStudent = useCallback((): { studentsGrouped: number; pagesLinked: number } => {
    // Build a map of studentId -> list of item indices (in order)
    const studentPages: Map<string, number[]> = new Map();
    
    items.forEach((item, index) => {
      const studentId = item.studentId || item.identification?.matchedStudentId;
      if (studentId) {
        const existing = studentPages.get(studentId) || [];
        existing.push(index);
        studentPages.set(studentId, existing);
      }
    });

    let studentsGrouped = 0;
    let pagesLinked = 0;

    // For each student with multiple pages, link them
    setItems(prev => {
      const updated = [...prev];
      
      studentPages.forEach((indices, studentId) => {
        if (indices.length <= 1) return; // Only one page, nothing to group
        
        studentsGrouped++;
        const primaryIndex = indices[0]; // First page becomes primary
        const primaryId = updated[primaryIndex].id;
        const primaryItem = updated[primaryIndex];
        
        // Mark primary as 'new' with continuation pages
        const continuationIds = indices.slice(1).map(idx => updated[idx].id);
        updated[primaryIndex] = {
          ...primaryItem,
          pageType: 'new',
          continuationOf: undefined,
          continuationPages: continuationIds,
        };

        // Mark subsequent pages as continuations
        indices.slice(1).forEach(idx => {
          pagesLinked++;
          updated[idx] = {
            ...updated[idx],
            pageType: 'continuation',
            continuationOf: primaryId,
            continuationPages: undefined,
            // Ensure student info is consistent
            studentId: primaryItem.studentId,
            studentName: primaryItem.studentName,
          };
        });
      });

      return updated;
    });

    return { studentsGrouped, pagesLinked };
  }, [items]);

  // Group pages by worksheet topic AND student name - for multi-page papers from same student on same topic
  const groupPagesByWorksheetTopic = useCallback((): { topicsGrouped: number; pagesLinked: number } => {
    // Build a map of (worksheetTopic + studentName) -> list of item indices
    // This groups papers like "Composite Figure Day 3" page 1 and page 2 for the same student
    const topicStudentPages: Map<string, number[]> = new Map();
    
    items.forEach((item, index) => {
      // Only group items that have both a worksheet topic and student identification
      const topic = item.worksheetTopic;
      const studentKey = item.studentId || item.identification?.matchedStudentId || item.studentName || item.identification?.handwrittenName;
      
      if (topic && studentKey) {
        const groupKey = `${topic}:::${studentKey.toLowerCase()}`;
        const existing = topicStudentPages.get(groupKey) || [];
        existing.push(index);
        topicStudentPages.set(groupKey, existing);
      }
    });

    let topicsGrouped = 0;
    let pagesLinked = 0;

    // For each topic+student combination with multiple pages, link them
    setItems(prev => {
      const updated = [...prev];
      
      topicStudentPages.forEach((indices, groupKey) => {
        if (indices.length <= 1) return; // Only one page, nothing to group
        
        topicsGrouped++;
        const primaryIndex = indices[0]; // First page becomes primary
        const primaryId = updated[primaryIndex].id;
        const primaryItem = updated[primaryIndex];
        
        // Get all continuation IDs (existing + new)
        const existingContinuations = primaryItem.continuationPages || [];
        const newContinuationIds = indices.slice(1).map(idx => updated[idx].id);
        const allContinuationIds = [...new Set([...existingContinuations, ...newContinuationIds])];
        
        // Mark primary as 'new' with continuation pages
        updated[primaryIndex] = {
          ...primaryItem,
          pageType: 'new',
          continuationOf: undefined,
          continuationPages: allContinuationIds,
        };

        // Mark subsequent pages as continuations
        indices.slice(1).forEach(idx => {
          pagesLinked++;
          updated[idx] = {
            ...updated[idx],
            pageType: 'continuation',
            continuationOf: primaryId,
            continuationPages: undefined,
            // Ensure student info is consistent
            studentId: primaryItem.studentId,
            studentName: primaryItem.studentName,
          };
        });
      });

      return updated;
    });

    return { topicsGrouped, pagesLinked };
  }, [items]);

  // Reorder items (drag and drop)
  const reorderItems = useCallback((activeId: string, overId: string) => {
    setItems(prev => {
      const oldIndex = prev.findIndex(item => item.id === activeId);
      const newIndex = prev.findIndex(item => item.id === overId);
      
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return prev;
      }
      
      const newItems = [...prev];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);
      
      return newItems;
    });
  }, []);

  const analyzeItemWithContinuations = async (
    item: BatchItem, 
    allItems: BatchItem[],
    rubricSteps?: RubricStep[], 
    assessmentMode?: 'teacher' | 'ai', 
    promptText?: string,
    useLearnedStyle?: boolean
  ): Promise<BatchItem> => {
    try {
      // Get all continuation page images
      const additionalImages: string[] = [];
      if (item.continuationPages && item.continuationPages.length > 0) {
        for (const contId of item.continuationPages) {
          const contItem = allItems.find(i => i.id === contId);
          if (contItem) {
            additionalImages.push(contItem.imageDataUrl);
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('analyze-student-work', {
        body: {
          imageBase64: item.imageDataUrl,
          additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
          rubricSteps,
          studentName: item.studentName,
          teacherId: user?.id,
          assessmentMode: assessmentMode || 'teacher',
          promptText,
          useLearnedStyle: useLearnedStyle || false,
        },
      });

      if (error) {
        const errorMsg = handleApiError(error, 'Analysis');
        throw new Error(errorMsg);
      }
      if (data?.error) {
        const errorMsg = handleApiError({ message: data.error }, 'Analysis');
        throw new Error(errorMsg);
      }
      if (!data?.success || !data?.analysis) throw new Error('Invalid response');

      // Apply grade curve if configured
      const curvedAnalysis = applyGradeCurve(data.analysis);

      return {
        ...item,
        status: 'completed',
        result: curvedAnalysis,
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

  const startBatchAnalysis = useCallback(async (rubricSteps?: RubricStep[], assessmentMode?: 'teacher' | 'ai', promptText?: string, answerGuideImage?: string, useLearnedStyle?: boolean) => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setSummary(null);

    // Get current items state for the async loop
    const currentItems = [...items];

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      
      // Skip continuation pages - they'll be analyzed with their primary paper
      if (item.pageType === 'continuation' && item.continuationOf) {
        // Mark as completed (will use primary's result)
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'completed' } : it
        ));
        continue;
      }

      setCurrentIndex(i);
      
      // Mark current item as analyzing
      setItems(prev => prev.map((it, idx) => 
        idx === i ? { ...it, status: 'analyzing' } : it
      ));

      // Mark any continuation pages as analyzing too
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'analyzing' } : it
        ));
      }

      const result = await analyzeItemWithContinuations(item, currentItems, rubricSteps, assessmentMode, promptText, useLearnedStyle);

      // Update primary item with result
      setItems(prev => prev.map((it, idx) => 
        idx === i ? result : it
      ));

      // Update continuation pages with the same result (they share the grade)
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'completed', result: result.result } : it
        ));
      }
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
  }, [items, isProcessing]);

  // Calculate confidence score based on grade consistency across multiple analyses
  const calculateConfidence = (grades: number[]): number => {
    if (grades.length < 2) return 100;
    const max = Math.max(...grades);
    const min = Math.min(...grades);
    const range = max - min;
    // If grades are within 5 points, very high confidence
    // If within 10 points, high confidence
    // If within 20 points, medium confidence
    // Beyond 20 points, lower confidence
    if (range <= 5) return 95;
    if (range <= 10) return 85;
    if (range <= 15) return 70;
    if (range <= 20) return 55;
    return Math.max(30, 100 - range * 2);
  };

  // Start confidence analysis - run multiple analyses per item and average
  const startConfidenceAnalysis = useCallback(async (
    analysisCount: 2 | 3,
    rubricSteps?: RubricStep[], 
    assessmentMode?: 'teacher' | 'ai', 
    promptText?: string
  ) => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setSummary(null);

    const currentItems = [...items];

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      
      // Skip continuation pages
      if (item.pageType === 'continuation' && item.continuationOf) {
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'completed' } : it
        ));
        continue;
      }

      setCurrentIndex(i);
      
      // Mark current item as analyzing
      setItems(prev => prev.map((it, idx) => 
        idx === i ? { ...it, status: 'analyzing' } : it
      ));

      // Mark any continuation pages as analyzing too
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'analyzing' } : it
        ));
      }

      // Run multiple analyses
      const analysisResults: AnalysisResult[] = [];
      for (let run = 0; run < analysisCount; run++) {
        const result = await analyzeItemWithContinuations(item, currentItems, rubricSteps, assessmentMode, promptText);
        if (result.result) {
          analysisResults.push(result.result);
        }
      }

      if (analysisResults.length === 0) {
        // All analyses failed
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'failed', error: 'All analysis attempts failed' } : it
        ));
        continue;
      }

      // Calculate final grade by averaging
      const grades = analysisResults.map(r => r.grade ?? r.totalScore.percentage);
      const averageGrade = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
      const confidenceScore = calculateConfidence(grades);

      // Combine the results - use first result as base but with averaged grade
      const combinedResult: AnalysisResult = {
        ...analysisResults[0],
        grade: averageGrade,
        gradeJustification: `Average of ${analysisCount} analyses (${grades.join('%, ')}%). ${analysisResults[0].gradeJustification || ''}`,
        multiAnalysisGrades: grades,
        multiAnalysisResults: analysisResults, // Store full breakdown of each run
        confidenceScore,
      };

      // Apply grade curve if configured
      const curvedResult = applyGradeCurve(combinedResult);

      // Update primary item with combined result
      setItems(prev => prev.map((it, idx) => 
        idx === i ? { ...it, status: 'completed', result: curvedResult } : it
      ));

      // Update continuation pages with the same result
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'completed', result: curvedResult } : it
        ));
      }
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
  }, [items, isProcessing, applyGradeCurve]);

  // Override grade for a specific item
  const overrideGrade = useCallback((itemId: string, newGrade: number, justification: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.result) {
        return {
          ...item,
          result: {
            ...item.result,
            isOverridden: true,
            overriddenGrade: newGrade,
            overrideJustification: justification,
            grade: newGrade,
            gradeJustification: `Teacher override: ${justification}. Original: ${item.result.multiAnalysisGrades?.join('%, ') || item.result.grade}%`,
            selectedRunIndex: undefined, // Clear selected run when manually overriding
          },
        };
      }
      return item;
    }));
  }, []);

  // Select a specific analysis run as the final grade (instead of average)
  const selectRunAsGrade = useCallback((itemId: string, runIndex: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.result?.multiAnalysisResults?.[runIndex]) {
        const selectedRun = item.result.multiAnalysisResults[runIndex];
        const selectedGrade = selectedRun.grade ?? selectedRun.totalScore.percentage;
        const originalGrades = item.result.multiAnalysisGrades || [];
        
        return {
          ...item,
          result: {
            ...item.result,
            grade: selectedGrade,
            gradeJustification: `Selected Run #${runIndex + 1} (${selectedGrade}%). Other runs: ${originalGrades.filter((_, i) => i !== runIndex).join('%, ')}%`,
            selectedRunIndex: runIndex,
            isOverridden: false,
            overriddenGrade: undefined,
            overrideJustification: undefined,
          },
        };
      }
      return item;
    }));
  }, []);

  // Teacher-guided batch analysis - analyzes all items with a common answer guide
  const startTeacherGuidedBatchAnalysis = useCallback(async (
    answerGuideImage: string,
    rubricSteps?: RubricStep[]
  ) => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setSummary(null);

    const currentItems = [...items];

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      
      // Skip continuation pages - they'll be analyzed with their primary paper
      if (item.pageType === 'continuation' && item.continuationOf) {
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'completed' } : it
        ));
        continue;
      }

      setCurrentIndex(i);
      
      // Mark current item as analyzing
      setItems(prev => prev.map((it, idx) => 
        idx === i ? { ...it, status: 'analyzing' } : it
      ));

      // Mark any continuation pages as analyzing too
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'analyzing' } : it
        ));
      }

      try {
        // Get all continuation page images
        const additionalImages: string[] = [];
        if (item.continuationPages && item.continuationPages.length > 0) {
          for (const contId of item.continuationPages) {
            const contItem = currentItems.find(it => it.id === contId);
            if (contItem) {
              additionalImages.push(contItem.imageDataUrl);
            }
          }
        }

        const { data, error } = await supabase.functions.invoke('analyze-student-work', {
          body: {
            imageBase64: item.imageDataUrl,
            additionalImages: additionalImages.length > 0 ? additionalImages : undefined,
            answerGuideBase64: answerGuideImage,
            rubricSteps,
            studentName: item.studentName,
            teacherId: user?.id,
            assessmentMode: 'teacher-guided',
          },
        });

        if (error) {
          const errorMsg = handleApiError(error, 'Analysis');
          throw new Error(errorMsg);
        }
        if (data?.error) {
          const errorMsg = handleApiError({ message: data.error }, 'Analysis');
          throw new Error(errorMsg);
        }
        if (!data?.success || !data?.analysis) throw new Error('Invalid response');

        const curvedAnalysis = applyGradeCurve(data.analysis);

        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'completed', result: curvedAnalysis, rawAnalysis: data.rawAnalysis } : it
        ));

        // Update continuation pages with the same result
        if (item.continuationPages && item.continuationPages.length > 0) {
          setItems(prev => prev.map(it => 
            item.continuationPages!.includes(it.id) ? { ...it, status: 'completed', result: curvedAnalysis } : it
          ));
        }
      } catch (err) {
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'failed', error: err instanceof Error ? err.message : 'Analysis failed' } : it
        ));
      }
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
  }, [items, isProcessing, user?.id]);

  const generateSummary = useCallback((): BatchSummary => {
    // Only count primary pages (not continuations) to avoid double-counting
    const completedItems = items.filter(item => 
      item.status === 'completed' && 
      item.result && 
      item.pageType !== 'continuation'
    );
    
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

    // Use overridden grade if available, then grade, then percentage
    const scores = completedItems.map(item => {
      const result = item.result!;
      return result.overriddenGrade ?? result.grade ?? result.totalScore.percentage;
    });
    
    const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
    
    if (validScores.length === 0) {
      return {
        totalStudents: completedItems.length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        commonMisconceptions: [],
        scoreDistribution: [],
      };
    }
    
    const averageScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    const highestScore = Math.max(...validScores);
    const lowestScore = Math.min(...validScores);
    const passRate = Math.round((validScores.filter(s => s >= 60).length / validScores.length) * 100);

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

    // Score distribution using valid scores
    const ranges = [
      { range: '0-59%', min: 0, max: 59 },
      { range: '60-69%', min: 60, max: 69 },
      { range: '70-79%', min: 70, max: 79 },
      { range: '80-89%', min: 80, max: 89 },
      { range: '90-100%', min: 90, max: 100 },
    ];
    const scoreDistribution = ranges.map(({ range, min, max }) => ({
      range,
      count: validScores.filter(s => s >= min && s <= max).length,
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

  // Re-analyze a single item (useful when analysis was incomplete)
  const reanalyzeItem = useCallback(async (
    itemId: string,
    rubricSteps?: RubricStep[],
    assessmentMode?: 'teacher' | 'ai',
    promptText?: string
  ): Promise<BatchItem | null> => {
    const itemIndex = items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      toast.error('Item not found');
      return null;
    }

    const item = items[itemIndex];
    
    // Mark item as analyzing
    setItems(prev => prev.map((it, idx) => 
      idx === itemIndex ? { ...it, status: 'analyzing', result: undefined, error: undefined } : it
    ));

    // Mark continuation pages as analyzing too
    if (item.continuationPages && item.continuationPages.length > 0) {
      setItems(prev => prev.map(it => 
        item.continuationPages!.includes(it.id) ? { ...it, status: 'analyzing' } : it
      ));
    }

    try {
      const result = await analyzeItemWithContinuations(
        { ...item, status: 'pending' }, 
        items, 
        rubricSteps, 
        assessmentMode, 
        promptText,
        true // Use learned style by default for reanalysis
      );

      // Update the item with new result
      setItems(prev => prev.map((it, idx) => 
        idx === itemIndex ? result : it
      ));

      // Also mark continuation pages as completed
      if (item.continuationPages && item.continuationPages.length > 0) {
        setItems(prev => prev.map(it => 
          item.continuationPages!.includes(it.id) ? { ...it, status: 'completed' } : it
        ));
      }

      if (result.status === 'completed') {
        toast.success(`Reanalysis complete for ${item.studentName || 'student'}`);
      } else {
        toast.error(`Reanalysis failed: ${result.error || 'Unknown error'}`);
      }

      // Regenerate summary
      setTimeout(() => generateSummary(), 100);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Reanalysis failed';
      toast.error(errorMsg);
      
      setItems(prev => prev.map((it, idx) => 
        idx === itemIndex ? { ...it, status: 'failed', error: errorMsg } : it
      ));

      return null;
    }
  }, [items, analyzeItemWithContinuations, generateSummary]);

  return {
    items,
    addImage,
    addImageWithAutoIdentify,
    addPdfPagesWithAutoGrouping,
    removeImage,
    updateItemStudent,
    reorderItems,
    clearAll,
    autoIdentifyAll,
    scanAllQRCodes,
    detectPageTypes,
    detectMultiPageByHandwriting,
    groupPagesByStudent,
    groupPagesByWorksheetTopic,
    linkContinuation,
    unlinkContinuation,
    unlinkAllPages,
    convertToSeparatePaper,
    startBatchAnalysis,
    startConfidenceAnalysis,
    startTeacherGuidedBatchAnalysis,
    reanalyzeItem,
    overrideGrade,
    selectRunAsGrade,
    isProcessing,
    isIdentifying,
    isRestoredFromStorage: hasLoadedFromStorage.current,
    currentIndex,
    summary,
    generateSummary,
  };
}
