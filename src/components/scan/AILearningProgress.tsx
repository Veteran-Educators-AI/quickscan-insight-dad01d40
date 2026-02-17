import { Brain, TrendingUp, Target, Sparkles, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAILearningStats } from '@/hooks/useAILearningStats';

interface AILearningProgressProps {
  compact?: boolean;
}

/**
 * AI Learning Progress Component
 * 
 * Now uses unified AI learning stats hook which consolidates 4-5 API calls into 1:
 * - Previously: separate calls to grading_corrections, interpretation_verifications (2x), name_corrections
 * - Now: single RPC call via useAILearningStats hook
 */
export function AILearningProgress({ compact = false }: AILearningProgressProps) {
  const { stats, isLoading } = useAILearningStats();

  const totalLearnings = stats 
    ? stats.gradingCorrections.count + stats.interpretationVerifications.totalCount + stats.nameCorrections.totalCount
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
                  <span className="font-medium">{stats?.gradingCorrections.count || 0}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Interpretation verifications:</span>
                  <span className="font-medium">{stats?.interpretationVerifications.totalCount || 0}</span>
                </li>
                <li className="flex justify-between gap-4">
                  <span>Name corrections:</span>
                  <span className="font-medium">{stats?.nameCorrections.totalCount || 0}</span>
                </li>
              </ul>
              {stats?.gradingCorrections.dominantStyle && (
                <p className="text-muted-foreground">
                  Your grading style: <span className="font-medium">{getStyleLabel(stats.gradingCorrections.dominantStyle)}</span>
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
            <span className="text-xl font-bold">{stats?.gradingCorrections.count || 0}</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Verified</span>
            </div>
            <span className="text-xl font-bold">{stats?.interpretationVerifications.totalCount || 0}</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-xs">Names</span>
            </div>
            <span className="text-xl font-bold">{stats?.nameCorrections.totalCount || 0}</span>
          </div>
        </div>

        {/* Grading style */}
        {stats?.gradingCorrections.dominantStyle && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Your grading style</span>
            </div>
            <Badge variant="secondary">{getStyleLabel(stats.gradingCorrections.dominantStyle)}</Badge>
          </div>
        )}

        {/* Verification accuracy */}
        {stats && stats.interpretationVerifications.totalCount > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">AI interpretation accuracy</span>
            </div>
            <span className={`font-medium ${stats.interpretationVerifications.accuracyRate >= 80 ? 'text-green-500' : stats.interpretationVerifications.accuracyRate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
              {stats.interpretationVerifications.accuracyRate.toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
