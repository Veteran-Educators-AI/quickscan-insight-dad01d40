import { CheckCircle2, XCircle, Loader2, CloudOff, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SyncStatus {
  sisterAppSync: 'idle' | 'syncing' | 'success' | 'failed' | 'disabled';
  webhookSync: 'idle' | 'syncing' | 'success' | 'failed' | 'disabled';
  lastSyncTime?: Date;
  sisterAppError?: string;
  webhookError?: string;
}

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  className?: string;
  showLabels?: boolean;
}

export function SyncStatusIndicator({ status, className, showLabels = true }: SyncStatusIndicatorProps) {
  const getSisterAppStatus = () => {
    switch (status.sisterAppSync) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: 'Syncing to Scholar AI...',
          variant: 'outline' as const,
          color: 'text-blue-500',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: 'Synced to Scholar AI',
          variant: 'default' as const,
          color: 'text-green-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: status.sisterAppError || 'Sync failed',
          variant: 'destructive' as const,
          color: 'text-destructive',
        };
      case 'disabled':
        return {
          icon: <CloudOff className="h-3.5 w-3.5" />,
          label: 'Scholar AI sync disabled',
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
        };
      default:
        return null;
    }
  };

  const getWebhookStatus = () => {
    switch (status.webhookSync) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: 'Sending webhook...',
          variant: 'outline' as const,
          color: 'text-blue-500',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: 'Webhook sent',
          variant: 'default' as const,
          color: 'text-green-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-3.5 w-3.5" />,
          label: status.webhookError || 'Webhook failed',
          variant: 'destructive' as const,
          color: 'text-destructive',
        };
      case 'disabled':
        return null; // Don't show webhook if disabled
      default:
        return null;
    }
  };

  const sisterApp = getSisterAppStatus();
  const webhook = getWebhookStatus();

  if (!sisterApp && !webhook) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {sisterApp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={sisterApp.variant}
                className={cn(
                  'gap-1.5 cursor-default transition-all',
                  sisterApp.variant === 'default' && 'bg-green-600 hover:bg-green-600',
                  sisterApp.variant === 'destructive' && 'animate-pulse'
                )}
              >
                <Zap className="h-3 w-3" />
                {sisterApp.icon}
                {showLabels && <span className="text-xs">{sisterApp.label}</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">
                {sisterApp.label}
                {status.lastSyncTime && status.sisterAppSync === 'success' && (
                  <span className="block text-muted-foreground">
                    {status.lastSyncTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {webhook && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={webhook.variant}
                className={cn(
                  'gap-1.5 cursor-default transition-all',
                  webhook.variant === 'default' && 'bg-blue-600 hover:bg-blue-600',
                  webhook.variant === 'destructive' && 'animate-pulse'
                )}
              >
                {webhook.icon}
                {showLabels && <span className="text-xs">{webhook.label}</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{webhook.label}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
