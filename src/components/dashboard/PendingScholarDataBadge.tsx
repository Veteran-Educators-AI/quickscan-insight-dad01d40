import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ChevronRight, ArrowDownToLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function PendingScholarDataBadge() {
  const { user } = useAuth();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-scholar-data', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Count unprocessed inbound events from scholar app
      const { count, error } = await supabase
        .from('sister_app_sync_log')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('processed', false)
        .in('action', ['grade_completed', 'activity_completed', 'reward_earned', 'level_up', 'achievement_unlocked', 'behavior_deduction', 'work_submitted']);

      if (error) {
        console.error('Error fetching pending scholar data:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (pendingCount === 0) return null;

  return (
    <Link to="/reports">
      <Card className="border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:shadow-md transition-all cursor-pointer">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="relative">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold animate-pulse">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">
              {pendingCount} pending {pendingCount === 1 ? 'item' : 'items'}
            </p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <ArrowDownToLine className="h-3 w-3" />
              Inbound Scholar data
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
