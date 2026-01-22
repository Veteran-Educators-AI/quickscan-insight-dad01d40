import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart3,
  Camera,
  FileText,
  Presentation,
  Settings,
  Zap,
  Users,
  Brain,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface UsageLogEntry {
  id: string;
  feature_name: string;
  feature_category: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface CategoryStats {
  category: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const categoryIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  scanning: { icon: <Camera className="h-4 w-4" />, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400' },
  worksheets: { icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' },
  lessons: { icon: <Presentation className="h-4 w-4" />, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400' },
  reports: { icon: <BarChart3 className="h-4 w-4" />, color: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' },
  classes: { icon: <Users className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400' },
  settings: { icon: <Settings className="h-4 w-4" />, color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400' },
  integrations: { icon: <Zap className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400' },
  ai: { icon: <Brain className="h-4 w-4" />, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400' },
  general: { icon: <TrendingUp className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' },
};

export function FeatureUsageReport() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>('7');
  const [showAllLogs, setShowAllLogs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['feature-usage', user?.id, dateRange],
    queryFn: async () => {
      if (!user) return { logs: [] as UsageLogEntry[], categoryStats: [] as CategoryStats[] };

      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const endDate = endOfDay(new Date());

      const { data: rawLogs, error } = await supabase
        .from('feature_usage_log')
        .select('*')
        .eq('teacher_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error fetching usage logs:', error);
        return { logs: [] as UsageLogEntry[], categoryStats: [] as CategoryStats[] };
      }

      // Transform to our interface
      const logs: UsageLogEntry[] = (rawLogs || []).map(log => ({
        id: log.id,
        feature_name: log.feature_name,
        feature_category: log.feature_category,
        action: log.action,
        metadata: (log.metadata || {}) as Record<string, unknown>,
        created_at: log.created_at,
      }));

      // Calculate category stats
      const categoryCounts: Record<string, number> = {};
      logs.forEach((log) => {
        categoryCounts[log.feature_category] = (categoryCounts[log.feature_category] || 0) + 1;
      });

      const categoryStats: CategoryStats[] = Object.entries(categoryCounts)
        .map(([category, count]) => ({
          category,
          count,
          icon: categoryIcons[category]?.icon || categoryIcons.general.icon,
          color: categoryIcons[category]?.color || categoryIcons.general.color,
        }))
        .sort((a, b) => b.count - a.count);

      return { logs: logs || [], categoryStats };
    },
    enabled: !!user,
  });

  const logs = data?.logs || [];
  const categoryStats = data?.categoryStats || [];
  const totalActions = logs.length;
  const displayedLogs = showAllLogs ? logs : logs.slice(0, 10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Feature Usage Tracking
            </CardTitle>
            <CardDescription>
              See which features you use most often
            </CardDescription>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-foreground">{totalActions}</p>
            <p className="text-sm text-muted-foreground">Total Actions</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-foreground">{categoryStats.length}</p>
            <p className="text-sm text-muted-foreground">Categories Used</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-foreground">
              {categoryStats[0]?.category || '—'}
            </p>
            <p className="text-sm text-muted-foreground">Top Category</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-foreground">
              {Math.round(totalActions / parseInt(dateRange)) || 0}
            </p>
            <p className="text-sm text-muted-foreground">Avg/Day</p>
          </div>
        </div>

        {/* Category Breakdown */}
        {categoryStats.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Usage by Category</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categoryStats.map((stat) => (
                <div
                  key={stat.category}
                  className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{stat.category}</p>
                    <p className="text-xs text-muted-foreground">{stat.count} uses</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Log */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Recent Activity</h4>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activity recorded yet</p>
              <p className="text-sm">Usage will be tracked as you use features</p>
            </div>
          ) : (
            <>
              <ScrollArea className={showAllLogs ? 'max-h-[400px]' : ''}>
                <div className="space-y-2">
                  {displayedLogs.map((log: UsageLogEntry) => {
                    const catInfo = categoryIcons[log.feature_category] || categoryIcons.general;
                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className={`p-1.5 rounded-md ${catInfo.color}`}>
                          {catInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.feature_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{log.action}</p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {logs.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="w-full"
                >
                  {showAllLogs ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show All ({logs.length} entries)
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
