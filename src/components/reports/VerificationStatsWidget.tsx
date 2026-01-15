import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useVerificationStats } from '@/hooks/useVerificationStats';
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Brain,
  Target
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface VerificationStatsWidgetProps {
  className?: string;
  compact?: boolean;
}

const chartConfig = {
  accuracy: {
    label: 'AI Accuracy',
    color: 'hsl(var(--primary))',
  },
  approved: {
    label: 'Approved',
    color: 'hsl(var(--success))',
  },
  rejected: {
    label: 'Rejected',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

export function VerificationStatsWidget({ className, compact = false }: VerificationStatsWidgetProps) {
  const stats = useVerificationStats(14); // Last 14 days for the chart

  if (stats.isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.totalVerifications === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Interpretation Learning
          </CardTitle>
          <CardDescription>Track AI grading accuracy from teacher verifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No verifications yet</p>
            <p className="text-sm mt-1">
              When you verify AI interpretations during grading, accuracy data will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = stats.recentTrend === 'improving' 
    ? TrendingUp 
    : stats.recentTrend === 'declining' 
      ? TrendingDown 
      : Minus;

  const trendColor = stats.recentTrend === 'improving'
    ? 'text-success'
    : stats.recentTrend === 'declining'
      ? 'text-destructive'
      : 'text-muted-foreground';

  const trendLabel = stats.recentTrend === 'improving'
    ? 'Improving'
    : stats.recentTrend === 'declining'
      ? 'Needs attention'
      : 'Stable';

  // Filter chart data to only show days with activity
  const chartData = stats.dailyStats.filter(d => d.total > 0).slice(-14);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Interpretation Learning
            </CardTitle>
            <CardDescription>Track AI grading accuracy from teacher verifications</CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 ${trendColor}`}
          >
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1.5 text-success mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.totalApproved}</span>
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1.5 text-destructive mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.totalRejected}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-primary/10">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Target className="h-4 w-4" />
              <span className="text-2xl font-bold">{stats.accuracyRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        {/* Accuracy Trend Chart */}
        {!compact && chartData.length > 1 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Accuracy Trend (Last 14 Days)</h4>
            <ChartContainer config={chartConfig} className="h-[150px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
                      formatter={(value, name) => (
                        <span className="font-medium">
                          {name === 'accuracy' ? `${value}% accuracy` : value}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#accuracyGradient)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {/* Learning Progress */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <p className="font-medium text-foreground mb-1">How AI Learning Works</p>
          <p>
            When you approve or reject AI interpretations, these decisions are saved and used to 
            improve future grading. The more you verify, the smarter the AI becomes at reading 
            your students' handwriting.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
