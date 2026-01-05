import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudentMastery } from './MasteryHeatMap';

interface TopicStrengthsChartProps {
  data: StudentMastery[];
  topics: { id: string; name: string }[];
}

interface TopicSummary {
  id: string;
  name: string;
  avgScore: number;
  totalAttempts: number;
  studentCount: number;
}

export function TopicStrengthsChart({ data, topics }: TopicStrengthsChartProps) {
  const topicSummaries = useMemo(() => {
    const summaries: Record<string, { total: number; count: number; attempts: number }> = {};

    data.forEach(student => {
      student.topics.forEach(topic => {
        if (!summaries[topic.topicId]) {
          summaries[topic.topicId] = { total: 0, count: 0, attempts: 0 };
        }
        if (topic.totalAttempts > 0) {
          summaries[topic.topicId].total += topic.avgScore;
          summaries[topic.topicId].count += 1;
          summaries[topic.topicId].attempts += topic.totalAttempts;
        }
      });
    });

    return topics
      .map(topic => {
        const summary = summaries[topic.id];
        return {
          id: topic.id,
          name: topic.name,
          avgScore: summary && summary.count > 0 ? Math.round(summary.total / summary.count) : 0,
          totalAttempts: summary?.attempts || 0,
          studentCount: summary?.count || 0,
        } as TopicSummary;
      })
      .filter(t => t.totalAttempts > 0)
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [data, topics]);

  const strengths = topicSummaries.filter(t => t.avgScore >= 70).slice(0, 5);
  const weaknesses = [...topicSummaries].sort((a, b) => a.avgScore - b.avgScore).filter(t => t.avgScore < 70).slice(0, 5);

  if (topicSummaries.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Strengths */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <CardTitle className="text-lg">Class Strengths</CardTitle>
          </div>
          <CardDescription>Topics where students excel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strengths.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No strong topics yet (70%+ average needed)
            </p>
          ) : (
            strengths.map((topic, index) => (
              <div key={topic.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                      index === 0 ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{topic.name}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{topic.avgScore}%</span>
                </div>
                <Progress value={topic.avgScore} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {topic.studentCount} students · {topic.totalAttempts} attempts
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Weaknesses */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Areas for Improvement</CardTitle>
          </div>
          <CardDescription>Topics needing attention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weaknesses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Minus className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">
                All topics are at 70%+ — great job!
              </p>
            </div>
          ) : (
            weaknesses.map((topic, index) => (
              <div key={topic.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center",
                      topic.avgScore < 50 ? "bg-red-500 text-white" : "bg-orange-400 text-white"
                    )}>
                      !
                    </span>
                    <span className="font-medium text-sm">{topic.name}</span>
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    topic.avgScore < 50 ? "text-red-600" : "text-orange-600"
                  )}>
                    {topic.avgScore}%
                  </span>
                </div>
                <Progress 
                  value={topic.avgScore} 
                  className={cn(
                    "h-2",
                    topic.avgScore < 50 ? "[&>div]:bg-red-500" : "[&>div]:bg-orange-400"
                  )} 
                />
                <p className="text-xs text-muted-foreground">
                  {topic.studentCount} students · {topic.totalAttempts} attempts
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
