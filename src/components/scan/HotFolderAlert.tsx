import { useState, useEffect } from 'react';
import { FileImage, Volume2, VolumeX, X, FolderSync, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '@/lib/notificationSound';

interface HotFolderAlertProps {
  newFilesCount: number;
  folderName?: string;
  onDismiss?: () => void;
  onViewFiles?: () => void;
  className?: string;
}

export function HotFolderAlert({
  newFilesCount,
  folderName,
  onDismiss,
  onViewFiles,
  className,
}: HotFolderAlertProps) {
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(0);

  // Play sound and animate when new files are detected
  useEffect(() => {
    if (newFilesCount > prevCount && newFilesCount > 0) {
      setIsAnimating(true);
      
      if (soundEnabled) {
        playNotificationSound('success');
      }
      
      // Reset animation after it completes
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
    setPrevCount(newFilesCount);
  }, [newFilesCount, prevCount, soundEnabled]);

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabledState(newValue);
    setSoundEnabled(newValue);
    
    // Play a test sound when enabling
    if (newValue) {
      playNotificationSound('success');
    }
  };

  if (newFilesCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border transition-all duration-300',
        isAnimating 
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]' 
          : 'border-primary/50 bg-primary/5',
        className
      )}
    >
      {/* Animated glow effect */}
      {isAnimating && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
      )}
      
      <div className="relative flex items-center gap-3 p-3">
        {/* Icon with pulse animation */}
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full bg-primary/20',
          isAnimating && 'animate-pulse'
        )}>
          <FolderSync className={cn(
            'h-5 w-5 text-primary',
            isAnimating && 'animate-spin'
          )} 
          style={{ animationDuration: '2s' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">New Scans Detected!</span>
            <Badge variant="default" className="bg-primary animate-bounce" style={{ animationDuration: '1s', animationIterationCount: isAnimating ? 'infinite' : '3' }}>
              <Sparkles className="h-3 w-3 mr-1" />
              {newFilesCount} new
            </Badge>
          </div>
          {folderName && (
            <p className="text-xs text-muted-foreground truncate">
              From: {folderName}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute notifications' : 'Enable sound'}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* View files button */}
          {onViewFiles && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewFiles}
              className="gap-1"
            >
              <FileImage className="h-3.5 w-3.5" />
              View
            </Button>
          )}

          {/* Dismiss button */}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
