import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { toast } from 'sonner';

export function NotificationSettings() {
  // Web push notifications
  const {
    isSupported: isWebSupported,
    isSubscribed: isWebSubscribed,
    isLoading: isWebLoading,
    permission: webPermission,
    subscribe: webSubscribe,
    unsubscribe: webUnsubscribe,
    error: webError,
  } = usePushNotifications();

  // Native push notifications
  const {
    isNative,
    isRegistered: isNativeRegistered,
    isLoading: isNativeLoading,
    register: nativeRegister,
    unregister: nativeUnregister,
    error: nativeError,
  } = useNativePushNotifications();

  const handleWebToggle = async () => {
    if (isWebSubscribed) {
      const success = await webUnsubscribe();
      if (success) {
        toast.success('Push notifications disabled');
      } else {
        toast.error('Failed to disable notifications');
      }
    } else {
      const success = await webSubscribe();
      if (success) {
        toast.success('Push notifications enabled! You will be notified when student work is analyzed.');
      } else if (webPermission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
      } else {
        toast.error('Failed to enable notifications');
      }
    }
  };

  const handleNativeToggle = async () => {
    if (isNativeRegistered) {
      const success = await nativeUnregister();
      if (success) {
        toast.success('Native push notifications disabled');
      } else {
        toast.error('Failed to disable native notifications');
      }
    } else {
      const success = await nativeRegister();
      if (success) {
        toast.success('Native push notifications enabled!');
      } else {
        toast.error('Failed to enable native notifications');
      }
    }
  };

  // Show native notification settings when running on native platform
  if (isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
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
                {isNativeRegistered ? 'Notifications enabled' : 'Notifications disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isNativeRegistered
                  ? "You'll receive push notifications on this device."
                  : 'Enable to receive push notifications on this device.'}
              </p>
            </div>
            <Button
              onClick={handleNativeToggle}
              disabled={isNativeLoading}
              variant={isNativeRegistered ? 'outline' : 'default'}
            >
              {isNativeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isNativeRegistered ? (
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

          {nativeError && (
            <p className="text-sm text-destructive">{nativeError}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Web push notifications
  if (!isWebSupported) {
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
              {isWebSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isWebSubscribed
                ? "You'll receive alerts when student work analysis is complete."
                : 'Enable to receive alerts for analyzed student work.'}
            </p>
          </div>
          <Button
            onClick={handleWebToggle}
            disabled={isWebLoading}
            variant={isWebSubscribed ? 'outline' : 'default'}
          >
            {isWebLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isWebSubscribed ? (
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

        {webPermission === 'denied' && (
          <p className="text-sm text-destructive">
            Notifications are blocked in your browser. To enable them, click the lock icon in your
            browser's address bar and allow notifications.
          </p>
        )}

        {webError && (
          <p className="text-sm text-destructive">{webError}</p>
        )}
      </CardContent>
    </Card>
  );
}
