import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Wrench, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Topic keyword mapping for cleanup
const TOPIC_KEYWORDS: Record<string, string> = {
  'credit card': 'Credit Card Basics',
  'interest charge': 'Interest Charges',
  'minimum payment': 'Minimum Payments',
  'apr': 'Annual Percentage Rate (APR)',
  'annual fee': 'Annual Fees',
  'finance charge': 'Finance Charges',
  'composite figure': 'Area of Composite Figures',
  'composite area': 'Area of Composite Figures',
  'triangle area': 'Triangle Area',
  'circle area': 'Circle Area',
  'rectangle area': 'Rectangle Area',
  'volume': 'Volume',
  'surface area': 'Surface Area',
  'geometric': 'Geometric Concepts',
  'proof': 'Geometric Proofs',
  'congruent': 'Congruence',
  'similar': 'Similarity',
  'parallel lines': 'Parallel Lines',
  'perpendicular': 'Perpendicular Lines',
  'angle': 'Angles',
  'coordinate': 'Coordinate Geometry',
  'transformation': 'Transformations',
  'debt': 'Debt Management',
  'payoff': 'Loan Payoff',
  'balance': 'Account Balance',
  'quadratic': 'Quadratic Equations',
  'linear': 'Linear Functions',
  'exponential': 'Exponential Functions',
  'polynomial': 'Polynomials',
  'rational': 'Rational Expressions',
  'radical': 'Radical Expressions',
  'logarithm': 'Logarithms',
  'sequence': 'Sequences & Series',
  'trigonometr': 'Trigonometry',
  'probability': 'Probability',
  'statistics': 'Statistics',
};

// Extract clean standard code from verbose text
function extractStandardCode(text: string): string {
  if (!text) return '';
  
  const patterns = [
    /\b([A-Z]-[A-Z]{2,4}\.[A-Z]\.\d+)\b/i,
    /\b([A-Z]\.[A-Z]{2,4}\.[A-Z]\.\d+)\b/i,
    /\b(CCSS\.MATH\.CONTENT\.[^,\s]+)/i,
    /\b(\d+\.[A-Z]{1,3}\.[A-Z]?\.\d+)\b/i,
    /\b(NGPF\.\d+\.\d+)\b/i,
    /\b([A-Z]{1,2}\.[A-Z]{1,4}\.\d+)\b/i,
    /\b([A-Z]-[A-Z]+\.\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  if (text.toLowerCase().includes('financial')) {
    if (text.toLowerCase().includes('interest')) return 'FIN.INT';
    if (text.toLowerCase().includes('credit')) return 'FIN.CRE';
    if (text.toLowerCase().includes('payment')) return 'FIN.PAY';
    return 'FIN.LIT';
  }

  return '';
}

// Extract clean topic name from verbose text
function extractCleanTopicName(text: string): string {
  if (!text) return '';
  
  const lowerText = text.toLowerCase();
  
  for (const [keyword, topic] of Object.entries(TOPIC_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return topic;
    }
  }
  
  return '';
}

// Check if a value is verbose (needs cleanup)
function isVerbose(text: string | null): boolean {
  if (!text) return false;
  return text.length > 100 || text.includes('**') || text.includes('\n');
}

interface GradeEntry {
  id: string;
  topic_name: string;
  nys_standard: string | null;
  student_id: string;
}

interface CleanupPreview {
  id: string;
  original_topic: string;
  clean_topic: string;
  original_standard: string | null;
  clean_standard: string;
  needs_cleanup: boolean;
}

export function GradeDataCleanup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch grade history entries that need cleanup
  const { data: grades, isLoading } = useQuery({
    queryKey: ['grade-cleanup', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grade_history')
        .select('id, topic_name, nys_standard, student_id')
        .eq('teacher_id', user!.id);
      
      if (error) throw error;
      return data as GradeEntry[];
    },
    enabled: !!user,
  });

  // Generate cleanup preview
  const cleanupPreview: CleanupPreview[] = (grades || []).map(grade => {
    const cleanTopic = extractCleanTopicName(grade.topic_name);
    const cleanStandard = extractStandardCode(grade.nys_standard || '');
    const needsTopicCleanup = isVerbose(grade.topic_name) && !!cleanTopic;
    const needsStandardCleanup = isVerbose(grade.nys_standard) && !!cleanStandard;
    
    return {
      id: grade.id,
      original_topic: grade.topic_name,
      clean_topic: cleanTopic || grade.topic_name,
      original_standard: grade.nys_standard,
      clean_standard: cleanStandard || (grade.nys_standard || ''),
      needs_cleanup: needsTopicCleanup || needsStandardCleanup,
    };
  });

  const entriesNeedingCleanup = cleanupPreview.filter(p => p.needs_cleanup);
  const totalEntries = grades?.length || 0;
  const cleanupCount = entriesNeedingCleanup.length;

  // Batch cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      setProgress(0);
      
      const toCleanup = entriesNeedingCleanup;
      let processed = 0;
      
      // Process in batches of 10
      const batchSize = 10;
      for (let i = 0; i < toCleanup.length; i += batchSize) {
        const batch = toCleanup.slice(i, i + batchSize);
        
        // Update each entry in the batch
        await Promise.all(batch.map(async (entry) => {
          const updates: { topic_name?: string; nys_standard?: string } = {};
          
          if (entry.clean_topic && entry.clean_topic !== entry.original_topic) {
            updates.topic_name = entry.clean_topic;
          }
          if (entry.clean_standard && entry.clean_standard !== entry.original_standard) {
            updates.nys_standard = entry.clean_standard;
          }
          
          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from('grade_history')
              .update(updates)
              .eq('id', entry.id);
            
            if (error) {
              console.error('Failed to update entry:', entry.id, error);
            }
          }
        }));
        
        processed += batch.length;
        setProgress(Math.round((processed / toCleanup.length) * 100));
      }
      
      return processed;
    },
    onSuccess: (count) => {
      toast.success(`Cleaned up ${count} grade entries!`);
      queryClient.invalidateQueries({ queryKey: ['grade-cleanup'] });
      queryClient.invalidateQueries({ queryKey: ['gradebook'] });
      queryClient.invalidateQueries({ queryKey: ['grade-history-stats'] });
      queryClient.invalidateQueries({ queryKey: ['standards-by-class'] });
      setIsProcessing(false);
      setProgress(0);
    },
    onError: (error) => {
      toast.error('Failed to cleanup entries');
      console.error(error);
      setIsProcessing(false);
      setProgress(0);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Grade Data Cleanup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading grade data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Grade Data Cleanup
        </CardTitle>
        <CardDescription>
          Fix verbose AI-generated topic names and standards with clean, concise values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xl font-bold">{totalEntries}</p>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xl font-bold text-orange-600">{cleanupCount}</p>
            <p className="text-xs text-muted-foreground">Need Cleanup</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xl font-bold text-emerald-600">{totalEntries - cleanupCount}</p>
            <p className="text-xs text-muted-foreground">Already Clean</p>
          </div>
        </div>

        {cleanupCount === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-100">All clean!</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                No verbose entries found that need cleanup.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Warning */}
            <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  {cleanupCount} entries have verbose names
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  These can be cleaned up to show concise topic names and standards.
                </p>
              </div>
            </div>

            {/* Preview Toggle */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Changes ({cleanupCount} entries)
                </>
              )}
            </Button>

            {/* Preview List */}
            {showPreview && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {entriesNeedingCleanup.slice(0, 20).map((entry, idx) => (
                    <div key={entry.id} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">#{idx + 1}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-16">Topic:</span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs text-red-600 line-through truncate max-w-[150px]">
                              {entry.original_topic.slice(0, 50)}...
                            </span>
                            <span className="text-xs">→</span>
                            <Badge variant="secondary" className="text-xs">
                              {entry.clean_topic}
                            </Badge>
                          </div>
                        </div>
                        
                        {entry.original_standard && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-16">Standard:</span>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs text-red-600 line-through truncate max-w-[150px]">
                                {(entry.original_standard || '').slice(0, 30)}...
                              </span>
                              <span className="text-xs">→</span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {entry.clean_standard}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {cleanupCount > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ...and {cleanupCount - 20} more entries
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Cleaning up entries...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Cleanup Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full" 
                  disabled={isProcessing || cleanupCount === 0}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cleaning Up...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Clean Up {cleanupCount} Entries
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Cleanup</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will update {cleanupCount} grade entries with clean, concise topic names and standards. 
                    This action cannot be undone, but the original data can be recovered from the grade justification field.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cleanupMutation.mutate()}>
                    Clean Up Entries
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
