import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ChevronDown, 
  ChevronUp,
  Target,
  CheckCircle,
  XCircle,
  Edit3,
  Calendar,
  BarChart3,
  Sparkles,
  Download,
  Upload,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface GradingCorrection {
  id: string;
  topic_name: string;
  ai_grade: number;
  corrected_grade: number;
  ai_justification: string | null;
  correction_reason: string | null;
  strictness_indicator: string | null;
  grading_focus: string[] | null;
  created_at: string;
}

interface InterpretationVerification {
  id: string;
  original_text: string;
  interpretation: string;
  decision: string;
  correct_interpretation: string | null;
  context: string | null;
  created_at: string;
}

interface NameCorrection {
  id: string;
  handwritten_name: string;
  normalized_name: string;
  times_used: number;
  created_at: string;
}

interface PatternAnalysis {
  topicPatterns: { topic: string; avgAdjustment: number; count: number }[];
  timePatterns: { period: string; avgAdjustment: number; count: number }[];
  styleEvolution: { date: string; style: string }[];
}

interface ExportData {
  version: string;
  exportedAt: string;
  gradingCorrections: Omit<GradingCorrection, 'id'>[];
  interpretationVerifications: Omit<InterpretationVerification, 'id'>[];
  nameCorrections: Omit<NameCorrection, 'id'>[];
}

export function AILearningHistory() {
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch grading corrections
  const { data: gradingCorrections = [], isLoading: loadingGrading } = useQuery({
    queryKey: ['grading-corrections-history', user?.id, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('grading_corrections')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GradingCorrection[];
    },
    enabled: !!user,
  });

  // Fetch interpretation verifications
  const { data: interpretations = [], isLoading: loadingInterpretations } = useQuery({
    queryKey: ['interpretation-verifications-history', user?.id, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('interpretation_verifications')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InterpretationVerification[];
    },
    enabled: !!user,
  });

  // Fetch name corrections
  const { data: nameCorrections = [], isLoading: loadingNames } = useQuery({
    queryKey: ['name-corrections-history', user?.id, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('name_corrections')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('times_used', { ascending: false });

      if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NameCorrection[];
    },
    enabled: !!user,
  });

  // Calculate pattern analysis
  const patternAnalysis: PatternAnalysis = (() => {
    // Topic patterns
    const topicMap = new Map<string, { total: number; count: number }>();
    gradingCorrections.forEach(c => {
      const existing = topicMap.get(c.topic_name) || { total: 0, count: 0 };
      existing.total += (c.corrected_grade - c.ai_grade);
      existing.count += 1;
      topicMap.set(c.topic_name, existing);
    });
    const topicPatterns = Array.from(topicMap.entries())
      .map(([topic, { total, count }]) => ({
        topic,
        avgAdjustment: total / count,
        count,
      }))
      .sort((a, b) => Math.abs(b.avgAdjustment) - Math.abs(a.avgAdjustment))
      .slice(0, 5);

    // Time patterns (by day of week)
    const dayMap = new Map<number, { total: number; count: number }>();
    gradingCorrections.forEach(c => {
      const day = new Date(c.created_at).getDay();
      const existing = dayMap.get(day) || { total: 0, count: 0 };
      existing.total += (c.corrected_grade - c.ai_grade);
      existing.count += 1;
      dayMap.set(day, existing);
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timePatterns = Array.from(dayMap.entries())
      .map(([day, { total, count }]) => ({
        period: dayNames[day],
        avgAdjustment: total / count,
        count,
      }))
      .sort((a, b) => dayNames.indexOf(a.period) - dayNames.indexOf(b.period));

    // Style evolution (last 10 changes)
    const styleEvolution = gradingCorrections
      .filter(c => c.strictness_indicator)
      .slice(0, 10)
      .map(c => ({
        date: format(new Date(c.created_at), 'MMM d'),
        style: c.strictness_indicator || 'unknown',
      }));

    return { topicPatterns, timePatterns, styleEvolution };
  })();

  // Export AI learning data
  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    
    try {
      // Fetch all data without time range filter for export
      const [gradingRes, interpRes, nameRes] = await Promise.all([
        supabase
          .from('grading_corrections')
          .select('topic_name, ai_grade, corrected_grade, ai_justification, correction_reason, strictness_indicator, grading_focus, created_at')
          .eq('teacher_id', user.id),
        supabase
          .from('interpretation_verifications')
          .select('original_text, interpretation, decision, correct_interpretation, context, created_at')
          .eq('teacher_id', user.id),
        supabase
          .from('name_corrections')
          .select('handwritten_name, normalized_name, times_used, created_at')
          .eq('teacher_id', user.id),
      ]);

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        gradingCorrections: gradingRes.data || [],
        interpretationVerifications: interpRes.data || [],
        nameCorrections: nameRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-learning-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('AI learning data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export learning data');
    } finally {
      setIsExporting(false);
    }
  };

  // Import AI learning data
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      if (!data.version || !data.gradingCorrections) {
        throw new Error('Invalid file format');
      }

      let importedCount = 0;

      // Import grading corrections
      if (data.gradingCorrections.length > 0) {
        const { error } = await supabase
          .from('grading_corrections')
          .insert(
            data.gradingCorrections.map(c => ({
              ...c,
              teacher_id: user.id,
            }))
          );
        if (!error) importedCount += data.gradingCorrections.length;
      }

      // Import interpretation verifications
      if (data.interpretationVerifications.length > 0) {
        const { error } = await supabase
          .from('interpretation_verifications')
          .insert(
            data.interpretationVerifications.map(v => ({
              ...v,
              teacher_id: user.id,
            }))
          );
        if (!error) importedCount += data.interpretationVerifications.length;
      }

      // Note: Name corrections require class_id and correct_student_id, so we skip those
      // as they are context-specific

      toast.success(`Imported ${importedCount} learning records!`);
      
      // Refresh queries
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import learning data. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getAdjustmentIcon = (adjustment: number) => {
    if (adjustment > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (adjustment < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getStyleBadge = (style: string | null) => {
    switch (style) {
      case 'more_lenient':
        return <Badge variant="outline" className="text-green-600 border-green-600">Lenient</Badge>;
      case 'more_strict':
        return <Badge variant="outline" className="text-red-600 border-red-600">Strict</Badge>;
      case 'as_expected':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Balanced</Badge>;
      default:
        return null;
    }
  };

  const isLoading = loadingGrading || loadingInterpretations || loadingNames;
  const totalCorrections = gradingCorrections.length + interpretations.length + nameCorrections.length;
  const avgGradeAdjustment = gradingCorrections.length > 0
    ? gradingCorrections.reduce((sum, c) => sum + (c.corrected_grade - c.ai_grade), 0) / gradingCorrections.length
    : 0;
  const interpretationAccuracy = interpretations.length > 0
    ? (interpretations.filter(i => i.decision === 'approved').length / interpretations.length) * 100
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Learning History
            </CardTitle>
            <CardDescription>
              Detailed view of all corrections and how they influence AI grading patterns
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting || isImporting}>
                  {isExporting || isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Transfer
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport} disabled={totalCorrections === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Learning Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Learning Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{totalCorrections}</div>
            <div className="text-sm text-muted-foreground">Total Learnings</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold flex items-center justify-center gap-1">
              {avgGradeAdjustment > 0 ? '+' : ''}{avgGradeAdjustment.toFixed(1)}
              {getAdjustmentIcon(avgGradeAdjustment)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Grade Adjustment</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{interpretationAccuracy.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">AI Accuracy</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="text-3xl font-bold text-primary">{nameCorrections.length}</div>
            <div className="text-sm text-muted-foreground">Name Mappings</div>
          </div>
        </div>

        {/* Pattern Analysis */}
        {patternAnalysis.topicPatterns.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pattern Analysis by Topic
            </h3>
            <div className="space-y-2">
              {patternAnalysis.topicPatterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{pattern.topic}</div>
                    <div className="text-xs text-muted-foreground">{pattern.count} corrections</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-sm font-medium ${pattern.avgAdjustment > 0 ? 'text-green-600' : pattern.avgAdjustment < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {pattern.avgAdjustment > 0 ? '+' : ''}{pattern.avgAdjustment.toFixed(1)} pts
                    </div>
                    {getAdjustmentIcon(pattern.avgAdjustment)}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              AI will apply these adjustments automatically for similar topics
            </p>
          </div>
        )}

        {/* Tabs for different correction types */}
        <Tabs defaultValue="grading" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="grading" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline">Grading</span>
              <Badge variant="secondary" className="ml-1">{gradingCorrections.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="interpretations" className="flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              <span className="hidden sm:inline">Interpretations</span>
              <Badge variant="secondary" className="ml-1">{interpretations.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="names" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Names</span>
              <Badge variant="secondary" className="ml-1">{nameCorrections.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Grading Corrections Tab */}
          <TabsContent value="grading" className="mt-4">
            {gradingCorrections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No grading corrections yet</p>
                <p className="text-sm">Corrections you make will appear here and train the AI</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {gradingCorrections.map((correction) => (
                  <Collapsible
                    key={correction.id}
                    open={expandedItems.has(correction.id)}
                    onOpenChange={() => toggleExpanded(correction.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{correction.topic_name}</span>
                            {getStyleBadge(correction.strictness_indicator)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(correction.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">{correction.ai_grade}</span>
                              <span>→</span>
                              <span className="font-medium">{correction.corrected_grade}</span>
                              <span className={`text-xs ${correction.corrected_grade > correction.ai_grade ? 'text-green-600' : 'text-red-600'}`}>
                                ({correction.corrected_grade > correction.ai_grade ? '+' : ''}{correction.corrected_grade - correction.ai_grade})
                              </span>
                            </div>
                          </div>
                          {expandedItems.has(correction.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1 space-y-2 text-sm border-x border-b rounded-b-lg bg-muted/20">
                        {correction.ai_justification && (
                          <div>
                            <span className="text-muted-foreground">AI Reasoning: </span>
                            <span>{correction.ai_justification}</span>
                          </div>
                        )}
                        {correction.correction_reason && (
                          <div>
                            <span className="text-muted-foreground">Your Feedback: </span>
                            <span className="font-medium">{correction.correction_reason}</span>
                          </div>
                        )}
                        {correction.grading_focus && correction.grading_focus.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground">Focus Areas:</span>
                            {correction.grading_focus.map((focus, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{focus}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            Impact: AI will adjust grades on similar {correction.topic_name} questions by ~{Math.abs(correction.corrected_grade - correction.ai_grade)} points
                          </span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Interpretations Tab */}
          <TabsContent value="interpretations" className="mt-4">
            {interpretations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Edit3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No interpretation verifications yet</p>
                <p className="text-sm">Verify AI interpretations to improve accuracy</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {interpretations.map((interp) => (
                  <div
                    key={interp.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      {interp.decision === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={interp.decision === 'approved' ? 'default' : 'destructive'} className="text-xs">
                            {interp.decision === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(interp.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Original: </span>
                          <span className="font-mono bg-muted px-1 rounded">{interp.original_text}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">AI Read: </span>
                          <span>{interp.interpretation}</span>
                        </div>
                        {interp.correct_interpretation && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Correct: </span>
                            <span className="font-medium text-green-600">{interp.correct_interpretation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Names Tab */}
          <TabsContent value="names" className="mt-4">
            {nameCorrections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No name corrections yet</p>
                <p className="text-sm">Name corrections help AI identify students accurately</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {nameCorrections.map((name) => (
                  <div
                    key={name.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded truncate">
                          {name.handwritten_name}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-sm truncate">{name.normalized_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Used {name.times_used} time{name.times_used !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Badge variant="secondary">{name.times_used}x</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Learning Impact Summary */}
        {totalCorrections > 0 && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">AI Learning Impact</p>
                <p className="text-sm text-muted-foreground">
                  Based on your {totalCorrections} corrections, the AI has learned that you prefer 
                  {avgGradeAdjustment > 2 ? ' more lenient ' : avgGradeAdjustment < -2 ? ' stricter ' : ' balanced '} 
                  grading. Future assessments will automatically apply these preferences, 
                  particularly for topics like {patternAnalysis.topicPatterns[0]?.topic || 'various subjects'}.
                </p>
                <Progress 
                  value={Math.min(100, totalCorrections)} 
                  className="h-2 mt-2" 
                />
                <p className="text-xs text-muted-foreground">
                  {totalCorrections >= 100 ? 'Fully trained!' : `${100 - totalCorrections} more corrections for optimal personalization`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
