import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface GradeHistoryEntry {
  id: string;
  topic_name: string;
  grade: number;
  grade_justification: string | null;
  created_at: string;
}

interface GradeHistoryChartProps {
  gradeHistory: GradeHistoryEntry[];
  topicName?: string;
  showTrend?: boolean;
}

export function GradeHistoryChart({ gradeHistory, topicName, showTrend = true }: GradeHistoryChartProps) {
  const chartData = useMemo(() => {
    return gradeHistory.map((entry) => ({
      date: format(new Date(entry.created_at), 'MMM d'),
      fullDate: format(new Date(entry.created_at), 'MMM d, yyyy'),
      grade: entry.grade,
      justification: entry.grade_justification,
      topicName: entry.topic_name,
    }));
  }, [gradeHistory]);

  const trend = useMemo(() => {
    if (gradeHistory.length < 2) return null;
    
    const firstGrade = gradeHistory[0].grade;
    const lastGrade = gradeHistory[gradeHistory.length - 1].grade;
    const diff = lastGrade - firstGrade;
    
    // Calculate average trend
    const avgGrade = gradeHistory.reduce((sum, e) => sum + e.grade, 0) / gradeHistory.length;
    
    return {
      direction: diff > 2 ? 'up' : diff < -2 ? 'down' : 'stable',
      change: diff,
      average: Math.round(avgGrade),
      latest: lastGrade,
    };
  }, [gradeHistory]);

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'secondary';
    if (trend.direction === 'up') return 'default';
    if (trend.direction === 'down') return 'destructive';
    return 'secondary';
  };

  if (gradeHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Grade History {topicName && `- ${topicName}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No grade history available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Grade History {topicName && `- ${topicName}`}
          </CardTitle>
          {showTrend && trend && (
            <div className="flex items-center gap-2">
              <Badge variant={getTrendColor() as any} className="flex items-center gap-1">
                {getTrendIcon()}
                {trend.change > 0 ? '+' : ''}{trend.change} pts
              </Badge>
              <span className="text-sm text-muted-foreground">
                Avg: {trend.average}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[55, 100]} 
                ticks={[55, 70, 80, 90, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 max-w-xs">
                      <p className="font-medium">{data.fullDate}</p>
                      <p className="text-lg font-bold text-primary">{data.grade}</p>
                      {data.topicName && (
                        <p className="text-xs text-muted-foreground">{data.topicName}</p>
                      )}
                      {data.justification && (
                        <p className="text-xs mt-1 text-muted-foreground">{data.justification}</p>
                      )}
                    </div>
                  );
                }}
              />
              {/* Reference line at 80 (Meets Standards) */}
              <ReferenceLine 
                y={80} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5" 
                label={{ 
                  value: 'Meets Standards', 
                  position: 'right', 
                  fontSize: 10,
                  fill: 'hsl(var(--muted-foreground))'
                }} 
              />
              <Line
                type="monotone"
                dataKey="grade"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Grade Scale Legend */}
        <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>55-69: Below</span>
          <span>70-79: Approaching</span>
          <span className="text-primary font-medium">80-89: Meets</span>
          <span>90-100: Exceeds</span>
        </div>
      </CardContent>
    </Card>
  );
}
