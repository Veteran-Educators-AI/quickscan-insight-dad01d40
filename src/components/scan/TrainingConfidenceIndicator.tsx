import { useEffect, useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface TrainingStats {
  totalCorrections: number;
  avgAdjustment: number;
  dominantStyle: string | null;
  consistency: number;
  isFullyTrained: boolean;
}

interface TrainingConfidenceIndicatorProps {
  compact?: boolean;
  className?: string;
}

const MIN_TRAINING_SAMPLES = 10;
const FULL_CONFIDENCE_SAMPLES = 50;

export function TrainingConfidenceIndicator({ 
  compact = false,
  className = ''
}: TrainingConfidenceIndicatorProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error, count } = await supabase
          .from('grading_corrections')
          .select('ai_grade, corrected_grade, strictness_indicator, topic_name', { count: 'exact' })
          .eq('teacher_id', user.id);

        if (error) throw error;

        if (!data || data.length === 0) {
          setStats({
            totalCorrections: 0,
            avgAdjustment: 0,
            dominantStyle: null,
            consistency: 0,
            isFullyTrained: false,
          });
          setIsLoading(false);
          return;
        }

        // Calculate average adjustment
        const avgAdjustment = data.reduce((sum, c) => sum + (c.corrected_grade - c.ai_grade), 0) / data.length;
        
        // Calculate strictness consistency
        const strictnessCounts = data.reduce((acc: Record<string, number>, c) => {
          if (c.strictness_indicator) {
            acc[c.strictness_indicator] = (acc[c.strictness_indicator] || 0) + 1;
          }
          return acc;
        }, {});

        const dominantStyle = Object.entries(strictnessCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        
        // Calculate consistency as percentage of corrections matching dominant style
        const dominantCount = dominantStyle ? strictnessCounts[dominantStyle] : 0;
        const consistency = data.length > 0 ? (dominantCount / data.length) * 100 : 0;

        setStats({
          totalCorrections: count || 0,
          avgAdjustment,
          dominantStyle,
          consistency,
          isFullyTrained: (count || 0) >= FULL_CONFIDENCE_SAMPLES,
        });
      } catch (error) {
        console.error('Error fetching training stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-muted rounded-lg h-8 ${className}`} />
    );
  }

  if (!stats) return null;

  const confidenceScore = Math.min(100, (stats.totalCorrections / FULL_CONFIDENCE_SAMPLES) * 100);
  const trainingProgress = Math.min(100, (stats.totalCorrections / MIN_TRAINING_SAMPLES) * 100);
  const needsMoreTraining = stats.totalCorrections < MIN_TRAINING_SAMPLES;

  const getConfidenceLevel = () => {
    if (stats.totalCorrections >= FULL_CONFIDENCE_SAMPLES) return { label: 'Expert', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' };
    if (stats.totalCorrections >= 30) return { label: 'High', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    if (stats.totalCorrections >= MIN_TRAINING_SAMPLES) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    return { label: 'Learning', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' };
  };

  const getStyleLabel = (style: string | null) => {
    switch (style) {
      case 'more_lenient': return 'Lenient';
      case 'more_strict': return 'Strict';
      case 'as_expected': return 'Balanced';
      default: return 'Unknown';
    }
  };

  const getStyleIcon = (style: string | null) => {
    switch (style) {
      case 'more_lenient': return '😊';
      case 'more_strict': return '📏';
      case 'as_expected': return '⚖️';
      default: return '❓';
    }
  };

  const confidenceLevel = getConfidenceLevel();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${confidenceLevel.bg} ${className}`}>
              <Brain className={`h-4 w-4 ${confidenceLevel.color}`} />
              <span className={`text-sm font-medium ${confidenceLevel.color}`}>
                {Math.round(confidenceScore)}% Match
              </span>
              {needsMoreTraining && (
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-3">
            <div className="space-y-2">
              <p className="font-medium">AI Training Confidence</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• {stats.totalCorrections} training samples</p>
                <p>• Grading style: {getStyleIcon(stats.dominantStyle)} {getStyleLabel(stats.dominantStyle)}</p>
                <p>• Style consistency: {Math.round(stats.consistency)}%</p>
                <p>• Avg adjustment: {stats.avgAdjustment > 0 ? '+' : ''}{stats.avgAdjustment.toFixed(1)} pts</p>
              </div>
              {needsMoreTraining && (
                <p className="text-xs text-orange-600">
                  Need {MIN_TRAINING_SAMPLES - stats.totalCorrections} more samples for accurate grading
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className={`h-5 w-5 ${confidenceLevel.color}`} />
            <span className="font-medium text-sm">AI Training Confidence</span>
          </div>
          <Badge variant="outline" className={confidenceLevel.bg}>
            {confidenceLevel.label}
          </Badge>
        </div>

        {/* Confidence Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Style Match</span>
            <span>{Math.round(confidenceScore)}%</span>
          </div>
          <Progress value={confidenceScore} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Training Samples</p>
            <p className="font-semibold flex items-center gap-1">
              {stats.totalCorrections}
              {stats.isFullyTrained && <CheckCircle className="h-3.5 w-3.5 text-green-600" />}
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Grading Style</p>
            <p className="font-semibold">
              {getStyleIcon(stats.dominantStyle)} {getStyleLabel(stats.dominantStyle)}
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Avg Adjustment</p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.avgAdjustment > 0 ? '+' : ''}{stats.avgAdjustment.toFixed(1)} pts
            </p>
          </div>
          
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">Consistency</p>
            <p className="font-semibold">{Math.round(stats.consistency)}%</p>
          </div>
        </div>

        {/* Training Needed Warning */}
        {needsMoreTraining && (
          <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Train with {MIN_TRAINING_SAMPLES - stats.totalCorrections} more samples for accurate AI grading. 
              Use the "Train AI" button to provide more examples.
            </p>
          </div>
        )}

        {stats.isFullyTrained && (
          <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded-md flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              AI is fully trained on your grading style! Grades should closely match your preferences.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
