import { useEffect, useState } from 'react';
import { Brain, TrendingUp, Target, Sparkles, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface LearningStats {
  gradingCorrections: number;
  interpretationVerifications: number;
  nameCorrections: number;
  dominantStyle: string | null;
  avgAdjustment: number;
  verificationAccuracy: number;
}

interface AILearningProgressProps {
  compact?: boolean;
}

export function AILearningProgress({ compact = false }: AILearningProgressProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch grading corrections
        const { data: gradingData, count: gradingCount } = await supabase
          .from('grading_corrections')
          .select('ai_grade, corrected_grade, strictness_indicator', { count: 'exact' })
          .eq('teacher_id', user.id);

        // Fetch interpretation verifications
        const { count: verificationCount } = await supabase
          .from('interpretation_verifications')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        // Fetch approved verifications for accuracy
        const { count: approvedCount } = await supabase
          .from('interpretation_verifications')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id)
          .eq('decision', 'approved');

        // Fetch name corrections
        const { count: nameCount } = await supabase
          .from('name_corrections')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', user.id);

        // Calculate stats
        let dominantStyle = null;
        let avgAdjustment = 0;
        
        if (gradingData && gradingData.length > 0) {
          avgAdjustment = gradingData.reduce((sum, c) => sum + (c.corrected_grade - c.ai_grade), 0) / gradingData.length;
          
          const strictnessCounts = gradingData.reduce((acc: Record<string, number>, c) => {
            if (c.strictness_indicator) {
              acc[c.strictness_indicator] = (acc[c.strictness_indicator] || 0) + 1;
            }
            return acc;
          }, {});

          dominantStyle = Object.entries(strictnessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        }

        const verificationAccuracy = verificationCount && verificationCount > 0 
          ? ((approvedCount || 0) / verificationCount) * 100 
          : 0;

        setStats({
          gradingCorrections: gradingCount || 0,
          interpretationVerifications: verificationCount || 0,
          nameCorrections: nameCount || 0,
          dominantStyle,
          avgAdjustment,
          verificationAccuracy,
        });
      } catch (error) {
        console.error('Error fetching AI learning stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  const totalLearnings = stats 
    ? stats.gradingCorrections + stats.interpretationVerifications + stats.nameCorrections 
    : 0;
  
  const trainingProgress = Math.min(100, (totalLearnings / 100) * 100);
  
  const getTrainingLevel = () => {
    if (totalLearnings >= 100) return { label: 'Expert', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (totalLearnings >= 50) return { label: 'Trained', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    if (totalLearnings >= 20) return { label: 'Learning', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    return { label: 'New', color: 'text-muted-foreground', bgColor: 'bg-muted' };
  };

  const getStyleLabel = (style: string | null) => {
    switch (style) {
      case 'more_lenient': return 'Lenient';
      case 'more_strict': return 'Strict';
      case 'as_expected': return 'Balanced';
      default: return 'Not determined';
    }
  };

  const trainingLevel = getTrainingLevel();

  if (isLoading) {
    return (
      <Card className={compact ? 'p-3' : ''}>
        <CardContent className={compact ? 'p-0' : 'pt-4'}>
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-2 w-full bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${trainingLevel.bgColor}`}>
                  <Brain className={`h-4 w-4 ${trainingLevel.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">AI Learning</span>
                    <Badge variant="outline" className={`text-xs ${trainingLevel.color}`}>
                      {trainingLevel.label}
                    </Badge>
                  </div>
                  <Progress value={trainingProgress} className="h-1.5 mt-1" />
                </div>
                <span className="text-lg font-bold tabular-nums">{totalLearnings}</span>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <p className="font-medium">AI has learned from:</p>
              <ul className="space-y-1">
                <li className="flex justify-between gap-4">
                  <span>Grade corrections:</span>
                  <span className="font-medium">{stats?.gradingCorrections || 0}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Interpretation verifications:</span>
                  <span className="font-medium">{stats?.interpretationVerifications || 0}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Name corrections:</span>
                  <span className="font-medium">{stats?.nameCorrections || 0}</span>
                </li>
              </ul>
              {stats?.dominantStyle && (
                <p className="text-muted-foreground">
                  Your grading style: <span className="font-medium">{getStyleLabel(stats.dominantStyle)}</span>
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-primary" />
          AI Learning Progress
          <Badge variant="outline" className={`ml-auto ${trainingLevel.color}`}>
            {trainingLevel.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Training progress</span>
            <span className="font-medium">{totalLearnings} / 100 samples</span>
          </div>
          <Progress value={trainingProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {totalLearnings >= 100 
              ? 'AI is fully trained to your grading style!' 
              : `${100 - totalLearnings} more corrections needed for optimal personalization`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-xs">Grades</span>
            </div>
            <span className="text-xl font-bold">{stats?.gradingCorrections || 0}</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Verified</span>
            </div>
            <span className="text-xl font-bold">{stats?.interpretationVerifications || 0}</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">Names</span>
            </div>
            <span className="text-xl font-bold">{stats?.nameCorrections || 0}</span>
          </div>
        </div>

        {/* Grading style */}
        {stats?.dominantStyle && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Your grading style</span>
            </div>
            <Badge variant="secondary">{getStyleLabel(stats.dominantStyle)}</Badge>
          </div>
        )}

        {/* Verification accuracy */}
        {stats && stats.interpretationVerifications > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">AI interpretation accuracy</span>
            </div>
            <span className={`font-medium ${stats.verificationAccuracy >= 80 ? 'text-green-500' : stats.verificationAccuracy >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {stats.verificationAccuracy.toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
