import { Download, Users, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BatchItem, BatchSummary } from '@/hooks/useBatchAnalysis';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BatchReportProps {
  items: BatchItem[];
  summary: BatchSummary;
  onExport: () => void;
}

export function BatchReport({ items, summary, onExport }: BatchReportProps) {
  const completedItems = items.filter(item => item.status === 'completed' && item.result);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Class Grading Report</h2>
          <p className="text-sm text-muted-foreground">
            {summary.totalStudents} papers analyzed
          </p>
        </div>
        <Button onClick={onExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalStudents}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getScoreColor(summary.averageScore)}`}>
                  {summary.averageScore}%
                </p>
                <p className="text-xs text-muted-foreground">Class Average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate (≥60%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Score Range</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-semibold text-red-600">{summary.lowestScore}%</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-lg font-semibold text-green-600">{summary.highestScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.scoreDistribution.map((dist) => (
              <div key={dist.range} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium">{dist.range}</span>
                <div className="flex-1">
                  <Progress 
                    value={(dist.count / summary.totalStudents) * 100} 
                    className="h-6"
                  />
                </div>
                <span className="w-12 text-sm text-right">
                  {dist.count} ({Math.round((dist.count / summary.totalStudents) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Misconceptions */}
      {summary.commonMisconceptions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Common Misconceptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.commonMisconceptions.map((item, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>{item.misconception}</span>
                  <Badge variant="secondary">{item.count} student(s)</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Individual Results Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Individual Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="hidden md:table-cell">Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.studentName}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${getScoreColor(item.result!.totalScore.percentage)}`}>
                      {item.result!.totalScore.earned}/{item.result!.totalScore.possible}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      ({item.result!.totalScore.percentage}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.result!.totalScore.percentage >= 60 ? 'default' : 'destructive'}>
                      {getGrade(item.result!.totalScore.percentage)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {item.result!.feedback || 'No feedback'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
