import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  User,
  Printer,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Target,
  Calendar,
  FileText,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Send,
  Sparkles,
  FileSpreadsheet,
  Loader2,
  GraduationCap,
  ArrowUp,
  ArrowRight,
  Compass,
  MapPin,
  Wand2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PrintRemediationQuestionsDialog } from '@/components/print/PrintRemediationQuestionsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useStudentNames } from '@/lib/StudentNameContext';
import { cn } from '@/lib/utils';
import scanGeniusLogo from '@/assets/scan-genius-logo.png';

interface StudentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

interface GradeEntry {
  id: string;
  topic_name: string;
  grade: number;
  regents_score: number | null;
  nys_standard: string | null;
  grade_justification: string | null;
  regents_justification: string | null;
  raw_score_earned: number | null;
  raw_score_possible: number | null;
  created_at: string;
}

interface DiagnosticEntry {
  id: string;
  topic_name: string;
  recommended_level: string | null;
  standard: string | null;
  notes: string | null;
  created_at: string;
}

interface SharedAssignment {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  coin_reward: number;
  due_at: string | null;
  status: string;
  topics: any[];
  created_at: string;
}

const LEVEL_VALUES: Record<string, number> = {
  A: 6, B: 5, C: 4, D: 3, E: 2, F: 1,
};

const LEVEL_BG_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-teal-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
  F: 'bg-red-700',
};

const LEVEL_ORDER = ['F', 'E', 'D', 'C', 'B', 'A'];

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  A: 'Advanced Mastery - Ready for enrichment',
  B: 'Proficient - Strong understanding',
  C: 'Developing - Building competency',
  D: 'Approaching - Needs reinforcement',
  E: 'Beginning - Requires intervention',
  F: 'Foundational - Needs intensive support',
};

// Calculate level from grade percentage
const gradeToLevel = (grade: number): string => {
  if (grade >= 95) return 'A';
  if (grade >= 85) return 'B';
  if (grade >= 75) return 'C';
  if (grade >= 65) return 'D';
  if (grade >= 55) return 'E';
  return 'F';
};

// Get next level up
const getNextLevel = (currentLevel: string): string | null => {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx < LEVEL_ORDER.length - 1) {
    return LEVEL_ORDER[idx + 1];
  }
  return null; // Already at A
};

// Suggested remedies for common misconception patterns
const REMEDIATION_SUGGESTIONS: Record<string, string[]> = {
  'sign error': ['Practice signed number operations with number lines', 'Use color coding for positive/negative values'],
  'order of operations': ['PEMDAS mnemonic practice', 'Stepwise problem breakdown exercises'],
  'fraction': ['Visual fraction models', 'Equivalent fraction practice'],
  'decimal': ['Place value reinforcement', 'Decimal-fraction conversion drills'],
  'variable': ['Substitution practice', 'Variable definition exercises'],
  'equation': ['Balance method practice', 'Inverse operation drills'],
  'graph': ['Coordinate plotting practice', 'Slope-intercept form exercises'],
  'exponent': ['Exponent rules flashcards', 'Scientific notation practice'],
  'arithmetic': ['Basic operations drills', 'Mental math exercises', 'Calculator-free practice'],
  'calculation': ['Step-by-step verification practice', 'Check work backwards technique'],
  'setup': ['Problem translation exercises', 'Identify given vs. unknown practice'],
  'formula': ['Formula reference sheet practice', 'Derivation understanding exercises'],
  'notation': ['Mathematical notation drills', 'Symbol meaning flashcards'],
  'conceptual': ['Visual representations', 'Real-world application examples'],
  'procedural': ['Step-by-step algorithm practice', 'Flowchart problem solving'],
  'incomplete': ['Showing all work practice', 'Justification writing exercises'],
  'default': ['Targeted practice problems', 'One-on-one tutoring session', 'Visual learning aids'],
};

// Extract misconceptions from grade justification text - improved to capture more patterns
const extractMisconceptionsFromJustification = (justification: string): { text: string; severity: 'high' | 'medium' | 'low' }[] => {
  const found: { text: string; severity: 'high' | 'medium' | 'low' }[] = [];
  
  // Split into sentences for better analysis
  const sentences = justification.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // High severity patterns - critical errors
  const highSeverityPatterns = [
    /(?:major|critical|significant|serious)\s+(?:error|mistake|issue)/i,
    /(?:completely|entirely|totally)\s+(?:wrong|incorrect|missed)/i,
    /(?:fundamental|basic)\s+(?:misunderstanding|misconception)/i,
    /(?:did not|didn't|failed to)\s+(?:understand|grasp|comprehend)/i,
    /(?:no|zero|lacking)\s+(?:credit|points?|marks?)/i,
  ];
  
  // Medium severity patterns - partial understanding issues
  const mediumSeverityPatterns = [
    /(?:partial|incomplete|missing)\s+(?:work|solution|answer|steps?)/i,
    /(?:error|mistake|incorrect|wrong)\s+(?:in|with|on)/i,
    /(?:should have|needed to|was supposed to)/i,
    /(?:forgot|omitted|skipped|missed)\s+(?:to|the)/i,
    /(?:sign error|calculation error|arithmetic error)/i,
    /(?:incorrect|wrong)\s+(?:formula|method|approach|setup)/i,
    /(?:misread|misinterpreted|confused)/i,
    /(?:lost|deducted)\s+\d+\s*(?:point|pt)/i,
  ];
  
  // Low severity patterns - minor issues
  const lowSeverityPatterns = [
    /(?:minor|small|slight)\s+(?:error|mistake|issue)/i,
    /(?:rounding|notation|formatting)\s+(?:error|issue)/i,
    /(?:could have|should consider)/i,
    /(?:almost|nearly|close to)\s+correct/i,
  ];
  
  // Process each sentence
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) return;
    
    // Check for negative/issue indicators
    const hasIssueIndicator = /(?:error|mistake|incorrect|wrong|missing|forgot|failed|did not|didn't|omitted|lost|deducted|issue|problem|misconception|confused|misunderstand)/i.test(trimmed);
    
    if (!hasIssueIndicator) return;
    
    // Determine severity
    let severity: 'high' | 'medium' | 'low' = 'medium';
    
    if (highSeverityPatterns.some(p => p.test(trimmed))) {
      severity = 'high';
    } else if (lowSeverityPatterns.some(p => p.test(trimmed))) {
      severity = 'low';
    }
    
    // Clean up the sentence
    let cleanText = trimmed
      .replace(/^[-•*]\s*/, '') // Remove bullet points
      .replace(/^\d+[.)]\s*/, '') // Remove numbered lists
      .replace(/^(?:however|also|additionally|furthermore|moreover),?\s*/i, '')
      .trim();
    
    // Capitalize first letter
    if (cleanText.length > 0) {
      cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
      // Add period if missing
      if (!/[.!?]$/.test(cleanText)) {
        cleanText += '.';
      }
    }
    
    if (cleanText.length > 15 && cleanText.length < 300) {
      found.push({ text: cleanText, severity });
    }
  });
  
  // Also check for bullet points or numbered issues specifically
  const bulletMatches = justification.match(/[-•*]\s*[^-•*\n]{15,}/g);
  if (bulletMatches) {
    bulletMatches.forEach(match => {
      const cleanMatch = match.replace(/^[-•*]\s*/, '').trim();
      if (cleanMatch.length > 15 && !found.some(f => f.text.includes(cleanMatch.substring(0, 30)))) {
        const hasIssue = /(?:error|mistake|incorrect|wrong|missing|forgot|failed|issue)/i.test(cleanMatch);
        if (hasIssue) {
          found.push({ text: cleanMatch, severity: 'medium' });
        }
      }
    });
  }
  
  // Dedupe by checking for similar text and limit
  const unique: { text: string; severity: 'high' | 'medium' | 'low' }[] = [];
  found.forEach(item => {
    const isDupe = unique.some(u => 
      u.text.toLowerCase().includes(item.text.toLowerCase().substring(0, 30)) ||
      item.text.toLowerCase().includes(u.text.toLowerCase().substring(0, 30))
    );
    if (!isDupe) {
      unique.push(item);
    }
  });
  
  // Sort by severity (high first) and limit
  return unique
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 8);
};

export function StudentReportDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    grades: true,
    diagnostics: true,
    misconceptions: true,
    pushedAssignments: true,
  });
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Remediation worksheet state
  const [isGeneratingRemediation, setIsGeneratingRemediation] = useState(false);
  const [remediationQuestions, setRemediationQuestions] = useState<any[]>([]);
  const [showRemediationDialog, setShowRemediationDialog] = useState(false);
  const [remediationTopicName, setRemediationTopicName] = useState('');
  
  // Next level worksheet state
  const [isGeneratingNextLevel, setIsGeneratingNextLevel] = useState(false);
  const [nextLevelQuestions, setNextLevelQuestions] = useState<any[]>([]);
  const [showNextLevelDialog, setShowNextLevelDialog] = useState(false);
  const [nextLevelTopicName, setNextLevelTopicName] = useState('');
  
  // Next topic suggestion state
  const [isLoadingNextTopic, setIsLoadingNextTopic] = useState(false);
  const [nextTopicSuggestion, setNextTopicSuggestion] = useState<{
    nextTopic: { name: string; standard: string; category: string };
    reasoning: string;
    prerequisiteReview?: string[];
    alternativeTopics?: { name: string; standard: string; reason: string }[];
    difficultyProgression: 'natural' | 'stretch' | 'consolidate';
  } | null>(null);

  // Fetch grade history
  const { data: gradeHistory, isLoading: gradesLoading } = useQuery({
    queryKey: ['student-report-grades', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_history')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GradeEntry[];
    },
    enabled: open && !!studentId,
  });

  // Fetch diagnostic results
  const { data: diagnosticResults, isLoading: diagnosticsLoading } = useQuery({
    queryKey: ['student-report-diagnostics', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostic_results')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiagnosticEntry[];
    },
    enabled: open && !!studentId,
  });

  // Fetch misconceptions from dedicated analysis_misconceptions table
  const { data: analysisMisconceptions } = useQuery({
    queryKey: ['student-report-analysis-misconceptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_misconceptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  // Fetch legacy misconceptions with topic info (from attempt_misconceptions)
  const { data: legacyMisconceptions } = useQuery({
    queryKey: ['student-report-misconceptions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempt_misconceptions')
        .select(`
          *,
          misconception:misconception_tags(name, description, topic:topics(name)),
          attempt:attempts!inner(student_id, created_at, question:questions(prompt_text))
        `)
        .eq('attempt.student_id', studentId);

      if (error) throw error;
      return data;
    },
    enabled: open && !!studentId,
  });

  // Fetch pushed assignments (shared_assignments) for this student's class
  const { data: pushedAssignments } = useQuery({
    queryKey: ['student-report-pushed-assignments', studentId],
    queryFn: async () => {
      // First get the student's class
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) return [];

      // Then fetch shared assignments for that class
      const { data, error } = await supabase
        .from('shared_assignments')
        .select('*')
        .eq('class_id', student.class_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SharedAssignment[];
    },
    enabled: open && !!studentId,
  });

  const isLoading = gradesLoading || diagnosticsLoading;

  // Combine analysis misconceptions (new table) with legacy misconceptions
  const allMisconceptions = useMemo(() => {
    const combined: any[] = [];
    
    // Add from new analysis_misconceptions table (primary source)
    if (analysisMisconceptions?.length) {
      analysisMisconceptions.forEach(m => {
        combined.push({
          type: 'analysis',
          id: m.id,
          text: m.misconception_text,
          topic: m.topic_name,
          severity: m.severity,
          remedies: m.suggested_remedies || [],
          gradeImpact: m.grade_impact,
          date: m.created_at,
        });
      });
    }
    
    // Add from legacy attempt_misconceptions table
    if (legacyMisconceptions?.length) {
      legacyMisconceptions.forEach((item: any) => {
        combined.push({
          type: 'legacy',
          id: item.misconception_id,
          text: item.misconception?.name || 'Unknown Misconception',
          description: item.misconception?.description,
          topic: item.misconception?.topic?.name,
          confidence: item.confidence,
          date: item.attempt?.created_at,
        });
      });
    }
    
    return combined;
  }, [analysisMisconceptions, legacyMisconceptions]);

  // Extract misconceptions from grade justifications - always extract from justifications
  const extractedMisconceptions = useMemo(() => {
    const extracted: { text: string; topic: string; grade: number; date: string; severity: 'high' | 'medium' | 'low'; standard?: string | null }[] = [];
    
    gradeHistory?.forEach(entry => {
      // Extract from ANY grade that has a justification (not just < 80%)
      if (entry.grade_justification) {
        const found = extractMisconceptionsFromJustification(entry.grade_justification);
        found.forEach(item => {
          extracted.push({
            text: item.text,
            severity: item.severity,
            topic: entry.topic_name,
            grade: entry.grade,
            date: entry.created_at,
            standard: entry.nys_standard,
          });
        });
      }
    });
    
    // Sort by severity then by date (most recent first)
    return extracted.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [gradeHistory]);

  // Derive diagnostic-like data from grade history - ALWAYS derive from grades to ensure data shows
  const derivedDiagnostics = useMemo(() => {
    // Group grades by topic and calculate derived levels
    const topicGrades: Record<string, { 
      grades: number[]; 
      latest: GradeEntry; 
      standard: string | null;
      justifications: string[];
    }> = {};
    
    gradeHistory?.forEach(entry => {
      if (!topicGrades[entry.topic_name]) {
        topicGrades[entry.topic_name] = { 
          grades: [], 
          latest: entry, 
          standard: entry.nys_standard,
          justifications: []
        };
      }
      topicGrades[entry.topic_name].grades.push(entry.grade);
      if (entry.grade_justification) {
        topicGrades[entry.topic_name].justifications.push(entry.grade_justification);
      }
      // Keep the most recent entry
      if (new Date(entry.created_at) > new Date(topicGrades[entry.topic_name].latest.created_at)) {
        topicGrades[entry.topic_name].latest = entry;
      }
    });
    
    return Object.entries(topicGrades).map(([topic, data]) => {
      const avgGrade = Math.round(data.grades.reduce((a, b) => a + b, 0) / data.grades.length);
      const latestGrade = data.latest.grade;
      const highestGrade = Math.max(...data.grades);
      const lowestGrade = Math.min(...data.grades);
      const recommendedLevel = gradeToLevel(latestGrade);
      
      // Generate summary notes
      let notes = `Based on ${data.grades.length} assessment(s). `;
      notes += `Latest: ${latestGrade}% | Average: ${avgGrade}%`;
      if (data.grades.length > 1) {
        notes += ` | Range: ${lowestGrade}%-${highestGrade}%`;
      }
      
      // Determine level description based on grade pattern
      let levelDescription = LEVEL_DESCRIPTIONS[recommendedLevel];
      if (data.grades.length >= 2) {
        const trend = data.grades[0] - data.grades[data.grades.length - 1];
        if (trend > 10) {
          levelDescription += ' (Improving trend)';
        } else if (trend < -10) {
          levelDescription += ' (Needs attention)';
        }
      }
      
      return {
        id: `derived-${topic}`,
        topic_name: topic,
        recommended_level: recommendedLevel,
        standard: data.standard,
        notes,
        created_at: data.latest.created_at,
        avgGrade,
        latestGrade,
        highestGrade,
        lowestGrade,
        assessmentCount: data.grades.length,
        levelDescription,
        hasJustifications: data.justifications.length > 0,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [gradeHistory]);

  // Combine real and derived diagnostics - always include derived for more complete picture
  const combinedDiagnostics = useMemo(() => {
    // If we have real diagnostics, use them but supplement with derived ones for any missing topics
    if (diagnosticResults?.length) {
      const realTopics = new Set(diagnosticResults.map(d => d.topic_name));
      const supplemental = derivedDiagnostics.filter(d => !realTopics.has(d.topic_name));
      return [...diagnosticResults, ...supplemental];
    }
    return derivedDiagnostics;
  }, [diagnosticResults, derivedDiagnostics]);

  // Determine current level and if student can advance
  const levelProgressInfo = useMemo(() => {
    // Get the most recent topic performance
    const latestGrade = gradeHistory?.[0];
    const latestDiagnostic = combinedDiagnostics[0];
    
    let currentLevel = latestDiagnostic?.recommended_level || (latestGrade ? gradeToLevel(latestGrade.grade) : 'C');
    let topicName = latestDiagnostic?.topic_name || latestGrade?.topic_name || 'General Math';
    let canAdvance = false;
    let nextLevel = getNextLevel(currentLevel);
    
    // Student can advance if latest grade is 100% OR if they're at Level A
    if (latestGrade?.grade === 100) {
      canAdvance = true;
    } else if (currentLevel === 'A') {
      canAdvance = true; // Can move to enrichment or new topic
      nextLevel = null;
    }
    
    return {
      currentLevel,
      nextLevel,
      canAdvance,
      topicName,
      latestGrade: latestGrade?.grade,
    };
  }, [gradeHistory, combinedDiagnostics]);

  // Calculate summary statistics
  const stats = {
    totalAssessments: (gradeHistory?.length || 0) + (diagnosticResults?.length || 0),
    avgGrade: gradeHistory?.length
      ? Math.round(gradeHistory.reduce((sum, g) => sum + g.grade, 0) / gradeHistory.length)
      : 0,
    avgRegents: gradeHistory?.filter(g => g.regents_score)?.length
      ? (gradeHistory.filter(g => g.regents_score).reduce((sum, g) => sum + (g.regents_score || 0), 0) /
          gradeHistory.filter(g => g.regents_score).length).toFixed(1)
      : 'N/A',
    currentLevel: levelProgressInfo.currentLevel,
    topicsAssessed: new Set([
      ...(gradeHistory?.map(g => g.topic_name) || []),
      ...(combinedDiagnostics?.map(d => d.topic_name) || []),
    ]).size,
    misconceptionCount: allMisconceptions.length + extractedMisconceptions.length,
    pushedCount: pushedAssignments?.length || 0,
  };

  // Get suggested remedies based on misconception name
  const getSuggestedRemedies = (misconceptionName: string): string[] => {
    const nameLower = misconceptionName.toLowerCase();
    for (const [key, remedies] of Object.entries(REMEDIATION_SUGGESTIONS)) {
      if (nameLower.includes(key)) {
        return remedies;
      }
    }
    return REMEDIATION_SUGGESTIONS.default;
  };

  // Calculate trend
  const trend = (() => {
    if (!gradeHistory || gradeHistory.length < 2) return 'stable';
    const recent = gradeHistory.slice(0, Math.min(3, gradeHistory.length));
    const older = gradeHistory.slice(-Math.min(3, gradeHistory.length));
    const recentAvg = recent.reduce((sum, g) => sum + g.grade, 0) / recent.length;
    const olderAvg = older.reduce((sum, g) => sum + g.grade, 0) / older.length;
    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'stable';
  })();

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Report - ${studentName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1f2937; }
            .report-header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
            .report-header h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
            .report-header p { color: #6b7280; font-size: 14px; }
            .logo { height: 40px; margin-bottom: 12px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .stat-box { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
            .stat-label { font-size: 12px; color: #6b7280; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
            .grade-entry { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
            .grade-topic { font-weight: 500; }
            .grade-score { font-weight: bold; }
            .grade-score.high { color: #059669; }
            .grade-score.medium { color: #d97706; }
            .grade-score.low { color: #dc2626; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-yellow { background: #fef9c3; color: #854d0e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .diagnostic-entry { padding: 8px 12px; border-left: 3px solid #3b82f6; background: #f8fafc; margin-bottom: 8px; }
            .misconception-item { padding: 8px 12px; background: #fef3c7; border-radius: 6px; margin-bottom: 8px; }
            .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <div class="footer">
            Generated by ScanGenius on ${format(new Date(), 'MMMM d, yyyy')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportPDF = () => {
    // Use print dialog as PDF export
    handlePrint();
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 80) return 'text-green-600';
    if (grade >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeClass = (grade: number) => {
    if (grade >= 80) return 'high';
    if (grade >= 60) return 'medium';
    return 'low';
  };

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Generate remediation worksheet from identified misconceptions
  const handleGenerateRemediation = async () => {
    // Gather all misconceptions for generation
    const misconceptionsToRemediate = allMisconceptions.length > 0 
      ? allMisconceptions.map(m => m.text)
      : extractedMisconceptions.map(m => m.text);
    
    if (misconceptionsToRemediate.length === 0) {
      toast({
        title: 'No misconceptions found',
        description: 'There are no misconceptions to generate remediation questions for.',
        variant: 'destructive',
      });
      return;
    }

    // Get the primary topic from misconceptions
    const primaryTopic = allMisconceptions[0]?.topic || 
                         extractedMisconceptions[0]?.topic || 
                         'Math Practice';
    
    setIsGeneratingRemediation(true);
    setRemediationTopicName(primaryTopic);

    try {
      const response = await supabase.functions.invoke('generate-remediation-questions', {
        body: {
          misconceptions: misconceptionsToRemediate.slice(0, 5), // Limit to 5 misconceptions
          studentName,
          problemContext: `Generating targeted remediation for student ${studentName} based on identified misconceptions from their assessments.`,
          questionsPerMisconception: 3,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate remediation questions');
      }

      const questions = response.data?.questions || [];
      if (questions.length === 0) {
        throw new Error('No questions were generated');
      }

      setRemediationQuestions(questions);
      setShowRemediationDialog(true);
      
      toast({
        title: 'Remediation worksheet generated!',
        description: `Created ${questions.length} targeted questions addressing ${misconceptionsToRemediate.length} misconception(s).`,
      });
    } catch (error: any) {
      console.error('Error generating remediation:', error);
      toast({
        title: 'Failed to generate remediation',
        description: error.message || 'An error occurred while generating questions.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingRemediation(false);
    }
  };

  // Generate next level worksheet based on student progress
  const handleGenerateNextLevelWorksheet = async () => {
    const { currentLevel, nextLevel, canAdvance, topicName, latestGrade } = levelProgressInfo;
    
    setIsGeneratingNextLevel(true);
    setNextLevelTopicName(topicName);

    try {
      // Determine worksheet type based on progress
      let worksheetType: 'same_level' | 'next_level' | 'enrichment' = 'same_level';
      let targetLevel = currentLevel;
      let prompt = '';
      
      if (latestGrade === 100 || canAdvance) {
        if (currentLevel === 'A') {
          worksheetType = 'enrichment';
          prompt = `Generate enrichment/challenge questions for a student who has mastered Level A in ${topicName}. Include real-world applications and advanced problem-solving.`;
        } else if (nextLevel) {
          worksheetType = 'next_level';
          targetLevel = nextLevel;
          prompt = `Generate questions at Level ${nextLevel} difficulty for ${topicName}. This student scored 100% and is ready to advance from Level ${currentLevel}. Include progressively challenging questions appropriate for Level ${nextLevel}.`;
        }
      } else {
        prompt = `Generate practice questions at Level ${currentLevel} difficulty for ${topicName}. This student scored ${latestGrade}% and needs more practice at the current level before advancing. Focus on reinforcing understanding with varied question types.`;
      }

      const response = await supabase.functions.invoke('generate-worksheet-questions', {
        body: {
          topic: topicName,
          level: targetLevel,
          questionCount: 6,
          includeHints: worksheetType === 'same_level',
          customPrompt: prompt,
          worksheetType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate worksheet');
      }

      const questions = response.data?.questions || [];
      if (questions.length === 0) {
        throw new Error('No questions were generated');
      }

      setNextLevelQuestions(questions);
      setShowNextLevelDialog(true);
      
      const typeMessage = worksheetType === 'next_level' 
        ? `Level ${targetLevel} advancement worksheet` 
        : worksheetType === 'enrichment' 
          ? 'Enrichment challenge worksheet'
          : `Level ${currentLevel} reinforcement worksheet`;
      
      toast({
        title: `${typeMessage} generated!`,
        description: `Created ${questions.length} questions for ${studentName}.`,
      });
    } catch (error: any) {
      console.error('Error generating next level worksheet:', error);
      toast({
        title: 'Failed to generate worksheet',
        description: error.message || 'An error occurred while generating questions.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingNextLevel(false);
    }
  };

  // Fetch AI suggestion for next topic when student is at Level A
  const handleSuggestNextTopic = async () => {
    setIsLoadingNextTopic(true);
    setNextTopicSuggestion(null);

    try {
      // Gather mastered topics from grade history (grades >= 95%)
      const masteredTopics = gradeHistory
        ?.filter(g => g.grade >= 95)
        .map(g => g.topic_name) || [];
      
      // Identify strengths and weaknesses
      const topicGrades: Record<string, number[]> = {};
      gradeHistory?.forEach(g => {
        if (!topicGrades[g.topic_name]) topicGrades[g.topic_name] = [];
        topicGrades[g.topic_name].push(g.grade);
      });
      
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      
      Object.entries(topicGrades).forEach(([topic, grades]) => {
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        if (avg >= 90) strengths.push(topic);
        else if (avg < 70) weaknesses.push(topic);
      });

      const response = await supabase.functions.invoke('suggest-next-topic', {
        body: {
          currentTopic: levelProgressInfo.topicName,
          masteredTopics: [...new Set(masteredTopics)],
          studentName,
          studentStrengths: strengths,
          studentWeaknesses: weaknesses,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get topic suggestion');
      }

      if (response.data?.suggestion) {
        setNextTopicSuggestion(response.data.suggestion);
        toast({
          title: 'Topic suggestion ready!',
          description: `Recommended: ${response.data.suggestion.nextTopic.name}`,
        });
      }
    } catch (error: any) {
      console.error('Error suggesting next topic:', error);
      toast({
        title: 'Failed to get suggestion',
        description: error.message || 'An error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNextTopic(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5" />
              Student Report: {studentName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(prev => Math.max(50, prev - 10))}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-12 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom(prev => Math.min(150, prev + 10))}
                  disabled={zoom >= 150}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)]">
          <div
            ref={reportRef}
            className="p-6 transition-transform origin-top-left"
            style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%` }}
          >
            {/* Report Header */}
            <div className="report-header text-center mb-6 pb-4 border-b">
              <img src={scanGeniusLogo} alt="ScanGenius" className="logo h-10 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">{studentName}</h1>
              <p className="text-muted-foreground text-sm">
                Student Performance Report • Generated {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className="stat-value text-2xl font-bold">{stats.totalAssessments}</div>
                <div className="stat-label text-xs text-muted-foreground">Total Assessments</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className={cn('stat-value text-2xl font-bold', getGradeColor(stats.avgGrade))}>
                  {stats.avgGrade}%
                </div>
                <div className="stat-label text-xs text-muted-foreground">Average Grade</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center">
                <div className="stat-value text-2xl font-bold">{stats.avgRegents}/6</div>
                <div className="stat-label text-xs text-muted-foreground">Avg Regents Score</div>
              </div>
              <div className="stat-box p-4 rounded-lg border bg-card text-center flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  {stats.currentLevel !== 'N/A' && (
                    <Badge className={cn(LEVEL_BG_COLORS[stats.currentLevel], 'text-white text-lg px-3')}>
                      {stats.currentLevel}
                    </Badge>
                  )}
                  {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                  {trend === 'stable' && <Minus className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="stat-label text-xs text-muted-foreground mt-1">Current Level</div>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.topicsAssessed}</p>
                    <p className="text-xs text-muted-foreground">Topics Assessed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.misconceptionCount}</p>
                    <p className="text-xs text-muted-foreground">Misconceptions</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    trend === 'up' && "bg-green-500/10",
                    trend === 'down' && "bg-red-500/10",
                    trend === 'stable' && "bg-blue-500/10"
                  )}>
                    {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                    {trend === 'stable' && <Minus className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-lg font-bold capitalize">{trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}</p>
                    <p className="text-xs text-muted-foreground">Performance Trend</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            {/* Grade History Section */}
            <Collapsible open={sectionsExpanded.grades} onOpenChange={() => toggleSection('grades')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Grade History
                    <Badge variant="secondary">{gradeHistory?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.grades ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-3 mt-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : gradeHistory?.length ? (
                    gradeHistory.map(entry => (
                      <Card key={entry.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">{entry.topic_name}</p>
                                {entry.nys_standard && (
                                  <Badge variant="outline" className="text-xs">
                                    {entry.nys_standard}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(entry.created_at), 'MMMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className={cn('text-2xl font-bold', getGradeColor(entry.grade))}>
                                  {entry.grade}%
                                </span>
                                {entry.raw_score_earned !== null && entry.raw_score_possible !== null && (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.raw_score_earned}/{entry.raw_score_possible} pts
                                  </p>
                                )}
                              </div>
                              {entry.regents_score !== null && (
                                <Badge
                                  className={cn(
                                    'text-white text-lg px-3 py-1',
                                    entry.regents_score >= 5 && 'bg-green-500',
                                    entry.regents_score >= 3 && entry.regents_score < 5 && 'bg-yellow-500',
                                    entry.regents_score < 3 && 'bg-red-500'
                                  )}
                                >
                                  {entry.regents_score}/6
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Grade Justification */}
                          {entry.grade_justification && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <FileText className="h-4 w-4 text-primary" />
                                Grade Justification
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {entry.grade_justification}
                              </p>
                            </div>
                          )}
                          
                          {/* Regents Justification */}
                          {entry.regents_justification && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1 text-blue-700 dark:text-blue-300">
                                <Award className="h-4 w-4" />
                                Regents Scoring Rationale
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                                {entry.regents_justification}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No grade history available
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Diagnostic Results Section */}
            <Collapsible open={sectionsExpanded.diagnostics} onOpenChange={() => toggleSection('diagnostics')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Target className="h-5 w-5 text-blue-500" />
                    Diagnostic Results
                    <Badge variant="secondary">{combinedDiagnostics?.length || 0}</Badge>
                    {!diagnosticResults?.length && derivedDiagnostics.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        Derived from grades
                      </Badge>
                    )}
                  </div>
                  {sectionsExpanded.diagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-2 mt-2">
                  {combinedDiagnostics?.length ? (
                    combinedDiagnostics.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="diagnostic-entry p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{entry.topic_name}</p>
                            {entry.standard && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {entry.standard}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.recommended_level && (
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={cn(LEVEL_BG_COLORS[entry.recommended_level], 'text-white')}>
                                  Level {entry.recommended_level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {LEVEL_DESCRIPTIONS[entry.recommended_level]}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        {/* Show derived info if available */}
                        {entry.avgGrade !== undefined && (
                          <div className="mt-2 flex items-center gap-3 text-sm">
                            <span className={cn('font-medium', getGradeColor(entry.latestGrade))}>
                              Latest: {entry.latestGrade}%
                            </span>
                            <span className="text-muted-foreground">
                              Avg: {entry.avgGrade}%
                            </span>
                            <span className="text-muted-foreground">
                              ({entry.assessmentCount} assessment{entry.assessmentCount !== 1 ? 's' : ''})
                            </span>
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No diagnostic results available - Scan student work to generate level data
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Misconceptions Section */}
            <Collapsible open={sectionsExpanded.misconceptions} onOpenChange={() => toggleSection('misconceptions')}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex-1">
                  <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Identified Misconceptions
                      <Badge variant="secondary">{stats.misconceptionCount}</Badge>
                    </div>
                    {sectionsExpanded.misconceptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                
                {/* Generate Remediation Button */}
                {stats.misconceptionCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-3 gap-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateRemediation();
                    }}
                    disabled={isGeneratingRemediation}
                  >
                    {isGeneratingRemediation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Remediation
                      </>
                    )}
                  </Button>
                )}
              </div>
              <CollapsibleContent>
                <div className="section space-y-3 mt-2">
                  {allMisconceptions.length > 0 ? (
                    allMisconceptions.map((item: any, idx: number) => {
                      const misconceptionName = item.text || 'Unknown Misconception';
                      const remedies = item.remedies?.length > 0 ? item.remedies : getSuggestedRemedies(misconceptionName);
                      
                      return (
                        <Card key={idx} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                                    {misconceptionName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.topic && (
                                    <Badge variant="outline" className="text-xs">
                                      Topic: {item.topic}
                                    </Badge>
                                  )}
                                  {item.severity && (
                                    <Badge 
                                      className={cn(
                                        'text-xs',
                                        item.severity === 'high' && 'bg-red-500 text-white',
                                        item.severity === 'medium' && 'bg-yellow-500 text-white',
                                        item.severity === 'low' && 'bg-green-500 text-white'
                                      )}
                                    >
                                      {item.severity} severity
                                    </Badge>
                                  )}
                                  {item.gradeImpact && (
                                    <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                      -{item.gradeImpact} pts impact
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {item.confidence && (
                                <Badge 
                                  className={cn(
                                    'text-white',
                                    item.confidence >= 0.8 && 'bg-red-500',
                                    item.confidence >= 0.5 && item.confidence < 0.8 && 'bg-yellow-500',
                                    item.confidence < 0.5 && 'bg-green-500'
                                  )}
                                >
                                  {Math.round(item.confidence * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                                {item.description}
                              </p>
                            )}
                            
                            {/* Suggested Remedies */}
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 text-sm font-medium mb-2 text-green-700 dark:text-green-300">
                                <Lightbulb className="h-4 w-4" />
                                Suggested Remediation Strategies
                              </div>
                              <ul className="space-y-1">
                                {remedies.map((remedy: string, rIdx: number) => (
                                  <li key={rIdx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    {remedy}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {item.date && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Identified on {format(new Date(item.date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : extractedMisconceptions.length > 0 ? (
                    // Show extracted misconceptions from grade justifications
                    <>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <FileText className="h-4 w-4 inline mr-1" />
                          The following issues were identified from AI analysis of student work:
                        </p>
                      </div>
                      {extractedMisconceptions.map((item, idx) => {
                        const remedies = getSuggestedRemedies(item.text);
                        
                        return (
                          <Card 
                            key={idx} 
                            className={cn(
                              "border-l-4",
                              item.severity === 'high' && 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
                              item.severity === 'medium' && 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
                              item.severity === 'low' && 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
                            )}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className={cn(
                                      "h-5 w-5 mt-0.5 shrink-0",
                                      item.severity === 'high' && 'text-red-600',
                                      item.severity === 'medium' && 'text-yellow-600',
                                      item.severity === 'low' && 'text-green-600'
                                    )} />
                                    <p className={cn(
                                      "font-medium text-sm",
                                      item.severity === 'high' && 'text-red-900 dark:text-red-100',
                                      item.severity === 'medium' && 'text-yellow-900 dark:text-yellow-100',
                                      item.severity === 'low' && 'text-green-900 dark:text-green-100'
                                    )}>
                                      {item.text}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2 ml-7">
                                    <Badge 
                                      className={cn(
                                        'text-xs text-white',
                                        item.severity === 'high' && 'bg-red-500',
                                        item.severity === 'medium' && 'bg-yellow-500',
                                        item.severity === 'low' && 'bg-green-500'
                                      )}
                                    >
                                      {item.severity === 'high' ? '⚠️ High' : item.severity === 'medium' ? '⚡ Medium' : '✓ Low'} Priority
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {item.topic}
                                    </Badge>
                                    {item.standard && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                        {item.standard}
                                      </Badge>
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        'text-xs',
                                        item.grade < 60 && 'border-red-300 text-red-600',
                                        item.grade >= 60 && item.grade < 80 && 'border-yellow-300 text-yellow-600',
                                        item.grade >= 80 && 'border-green-300 text-green-600'
                                      )}
                                    >
                                      Score: {item.grade}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Suggested Remedies */}
                              <div className="mt-3 ml-7 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 text-sm font-medium mb-2 text-green-700 dark:text-green-300">
                                  <Lightbulb className="h-4 w-4" />
                                  Suggested Remediation Strategies
                                </div>
                                <ul className="space-y-1">
                                  {remedies.map((remedy, rIdx) => (
                                    <li key={rIdx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                      <span className="text-green-500 mt-0.5">•</span>
                                      {remedy}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <p className="text-xs text-muted-foreground mt-2 ml-7">
                                From assessment on {format(new Date(item.date), 'MMM d, yyyy')}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No misconceptions identified - Great work!
                    </div>
                  )}

                  {/* Show extracted misconceptions as supplemental even if allMisconceptions exist */}
                  {allMisconceptions.length > 0 && extractedMisconceptions.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <FileText className="h-4 w-4 inline mr-1" />
                          Additional issues from grade justifications:
                        </p>
                      </div>
                      {extractedMisconceptions.slice(0, 5).map((item, idx) => (
                        <Card 
                          key={`ext-${idx}`} 
                          className={cn(
                            "border-l-4",
                            item.severity === 'high' && 'border-l-red-500 bg-red-50/30 dark:bg-red-950/10',
                            item.severity === 'medium' && 'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10',
                            item.severity === 'low' && 'border-l-green-500 bg-green-50/30 dark:bg-green-950/10'
                          )}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className={cn(
                                "h-4 w-4 mt-0.5 shrink-0",
                                item.severity === 'high' && 'text-red-500',
                                item.severity === 'medium' && 'text-yellow-500',
                                item.severity === 'low' && 'text-green-500'
                              )} />
                              <div>
                                <p className="text-sm">{item.text}</p>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">{item.topic}</Badge>
                                  <Badge 
                                    className={cn(
                                      'text-xs text-white',
                                      item.severity === 'high' && 'bg-red-500',
                                      item.severity === 'medium' && 'bg-yellow-500',
                                      item.severity === 'low' && 'bg-green-500'
                                    )}
                                  >
                                    {item.severity}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Pushed Assignments to Scholar App */}
            <Collapsible open={sectionsExpanded.pushedAssignments} onOpenChange={() => toggleSection('pushedAssignments')}>
              <CollapsibleTrigger className="w-full">
                <div className="section-title flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 font-semibold">
                    <Send className="h-5 w-5 text-purple-500" />
                    Problem Sets Pushed to Scholar App
                    <Badge variant="secondary">{pushedAssignments?.length || 0}</Badge>
                  </div>
                  {sectionsExpanded.pushedAssignments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="section space-y-3 mt-2">
                  {pushedAssignments?.length ? (
                    pushedAssignments.map(assignment => {
                      const topics = Array.isArray(assignment.topics) ? assignment.topics : [];
                      
                      return (
                        <Card key={assignment.id} className="border-purple-200 dark:border-purple-800">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-5 w-5 text-purple-500" />
                                  <p className="font-semibold">{assignment.title}</p>
                                </div>
                                {assignment.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {assignment.description}
                                  </p>
                                )}
                              </div>
                              <Badge 
                                className={cn(
                                  'text-white',
                                  assignment.status === 'active' && 'bg-green-500',
                                  assignment.status === 'completed' && 'bg-blue-500',
                                  assignment.status === 'expired' && 'bg-gray-500'
                                )}
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                            
                            {/* Rewards */}
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1 text-sm">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                  🏆 {assignment.xp_reward} XP
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                                  🪙 {assignment.coin_reward} Coins
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Topics */}
                            {topics.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Topics Covered:</p>
                                <div className="flex flex-wrap gap-1">
                                  {topics.map((topic: any, tIdx: number) => (
                                    <Badge key={tIdx} variant="secondary" className="text-xs">
                                      {typeof topic === 'string' ? topic : topic.name || 'Unknown'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                              <span>Pushed on {format(new Date(assignment.created_at), 'MMM d, yyyy')}</span>
                              {assignment.due_at && (
                                <span className="text-orange-600">
                                  Due: {format(new Date(assignment.due_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No problem sets pushed to Scholar App yet
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-6" />

            {/* Generate Next Level Worksheet Section */}
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Generate Next Level Worksheet</h3>
                        <p className="text-sm text-muted-foreground">
                          Based on {studentName}'s performance in {levelProgressInfo.topicName}
                        </p>
                      </div>
                    </div>
                    
                    {/* Level Progress Indicator */}
                    <div className="mt-4 p-4 rounded-lg bg-card border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Current Level:</span>
                          <Badge className={cn(LEVEL_BG_COLORS[levelProgressInfo.currentLevel], 'text-white text-lg px-3')}>
                            {levelProgressInfo.currentLevel}
                          </Badge>
                        </div>
                        {levelProgressInfo.latestGrade !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Latest Score:</span>
                            <span className={cn('font-bold text-lg', getGradeColor(levelProgressInfo.latestGrade))}>
                              {levelProgressInfo.latestGrade}%
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Progress Arrow */}
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className={cn(LEVEL_BG_COLORS[levelProgressInfo.currentLevel], 'text-white')}>
                          Level {levelProgressInfo.currentLevel}
                        </Badge>
                        {levelProgressInfo.canAdvance && levelProgressInfo.nextLevel ? (
                          <>
                            <ArrowRight className="h-5 w-5 text-green-500" />
                            <Badge className={cn(LEVEL_BG_COLORS[levelProgressInfo.nextLevel], 'text-white')}>
                              Level {levelProgressInfo.nextLevel}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              Ready to Advance!
                            </Badge>
                          </>
                        ) : levelProgressInfo.currentLevel === 'A' ? (
                          <>
                            <ArrowRight className="h-5 w-5 text-primary" />
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                              🌟 Enrichment
                            </Badge>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground ml-2">
                            Needs {100 - (levelProgressInfo.latestGrade || 0)}% more to advance
                          </span>
                        )}
                      </div>
                      
                      {/* Recommendation */}
                      <p className="text-sm mt-3 p-2 rounded bg-muted/50">
                        {levelProgressInfo.canAdvance 
                          ? levelProgressInfo.currentLevel === 'A'
                            ? "🎉 This student has mastered Level A! Generate enrichment challenges or move to a new topic."
                            : `🎉 Scored 100%! Ready to advance to Level ${levelProgressInfo.nextLevel} challenges.`
                          : `📚 Generate practice at Level ${levelProgressInfo.currentLevel} to reinforce understanding before advancing.`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="lg"
                    className={cn(
                      "gap-2 min-w-[180px]",
                      levelProgressInfo.canAdvance 
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        : ""
                    )}
                    onClick={handleGenerateNextLevelWorksheet}
                    disabled={isGeneratingNextLevel || !gradeHistory?.length}
                  >
                    {isGeneratingNextLevel ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : levelProgressInfo.canAdvance ? (
                      <>
                        <ArrowUp className="h-4 w-4" />
                        Advance to {levelProgressInfo.nextLevel || 'Enrichment'}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Practice Level {levelProgressInfo.currentLevel}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suggest Next Topic Section - Only shown when at Level A or mastered */}
            {(levelProgressInfo.currentLevel === 'A' || levelProgressInfo.canAdvance) && (
              <>
                <Separator className="my-6" />
                
                <Card className="border-2 border-dashed border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500">
                        <Compass className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Wand2 className="h-5 w-5 text-violet-500" />
                              Suggest Next Topic
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              AI-powered curriculum recommendation for {studentName}'s next learning goal
                            </p>
                          </div>
                          
                          <Button
                            variant={nextTopicSuggestion ? "outline" : "default"}
                            className={cn(
                              "gap-2",
                              !nextTopicSuggestion && "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                            )}
                            onClick={handleSuggestNextTopic}
                            disabled={isLoadingNextTopic}
                          >
                            {isLoadingNextTopic ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing...
                              </>
                            ) : nextTopicSuggestion ? (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Get New Suggestion
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Get AI Suggestion
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {/* AI Suggestion Results */}
                        {nextTopicSuggestion && (
                          <div className="mt-4 space-y-4">
                            {/* Main Recommendation */}
                            <div className="p-4 rounded-lg bg-white dark:bg-card border-2 border-violet-200 dark:border-violet-800">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="h-5 w-5 text-violet-500" />
                                    <h4 className="font-bold text-lg text-violet-700 dark:text-violet-300">
                                      {nextTopicSuggestion.nextTopic.name}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {nextTopicSuggestion.nextTopic.standard}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {nextTopicSuggestion.nextTopic.category}
                                    </Badge>
                                    <Badge 
                                      className={cn(
                                        'text-xs text-white',
                                        nextTopicSuggestion.difficultyProgression === 'natural' && 'bg-blue-500',
                                        nextTopicSuggestion.difficultyProgression === 'stretch' && 'bg-orange-500',
                                        nextTopicSuggestion.difficultyProgression === 'consolidate' && 'bg-green-500'
                                      )}
                                    >
                                      {nextTopicSuggestion.difficultyProgression === 'natural' && '📈 Natural Progression'}
                                      {nextTopicSuggestion.difficultyProgression === 'stretch' && '🚀 Stretch Challenge'}
                                      {nextTopicSuggestion.difficultyProgression === 'consolidate' && '🔄 Consolidation'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="mt-3 text-sm text-muted-foreground">
                                {nextTopicSuggestion.reasoning}
                              </p>
                              
                              {/* Prerequisite Review */}
                              {nextTopicSuggestion.prerequisiteReview && nextTopicSuggestion.prerequisiteReview.length > 0 && (
                                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                                    📝 Quick review recommended before starting:
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {nextTopicSuggestion.prerequisiteReview.map((topic, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/30">
                                        {topic}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Alternative Topics */}
                            {nextTopicSuggestion.alternativeTopics && nextTopicSuggestion.alternativeTopics.length > 0 && (
                              <div className="p-4 rounded-lg bg-muted/50 border">
                                <p className="text-sm font-medium mb-2 text-muted-foreground">
                                  Alternative options:
                                </p>
                                <div className="space-y-2">
                                  {nextTopicSuggestion.alternativeTopics.map((alt, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-card border">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{alt.name}</span>
                                        <Badge variant="outline" className="text-xs">{alt.standard}</Badge>
                                      </div>
                                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                                        {alt.reason}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Empty State */}
                        {!nextTopicSuggestion && !isLoadingNextTopic && (
                          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                            <Compass className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                              Click "Get AI Suggestion" to receive a personalized recommendation for {studentName}'s next topic
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Remediation Questions Print Dialog */}
      <PrintRemediationQuestionsDialog
        open={showRemediationDialog}
        onOpenChange={setShowRemediationDialog}
        questions={remediationQuestions}
        studentName={studentName}
        topicName={remediationTopicName}
      />
      
      {/* Next Level Worksheet Print Dialog */}
      <PrintRemediationQuestionsDialog
        open={showNextLevelDialog}
        onOpenChange={setShowNextLevelDialog}
        questions={nextLevelQuestions}
        studentName={studentName}
        topicName={`${nextLevelTopicName} - Level ${levelProgressInfo.canAdvance ? (levelProgressInfo.nextLevel || 'Enrichment') : levelProgressInfo.currentLevel}`}
      />
    </Dialog>
  );
}
