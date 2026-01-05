import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    error,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notifications disabled');
      } else {
        toast.error('Failed to disable notifications');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled! You will be notified when student work is analyzed.');
      } else if (permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
      } else {
        toast.error('Failed to enable notifications');
      }
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified when student work has been analyzed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? "You'll receive alerts when student work analysis is complete."
                : 'Enable to receive alerts for analyzed student work.'}
            </p>
          </div>
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant={isSubscribed ? 'outline' : 'default'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>

        {permission === 'denied' && (
          <p className="text-sm text-destructive">
            Notifications are blocked in your browser. To enable them, click the lock icon in your
            browser's address bar and allow notifications.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
