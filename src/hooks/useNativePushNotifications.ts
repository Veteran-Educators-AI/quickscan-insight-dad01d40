import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface UseNativePushNotificationsReturn {
  isNative: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
  register: () => Promise<boolean>;
  unregister: () => Promise<boolean>;
  error: string | null;
}

export function useNativePushNotifications(): UseNativePushNotificationsReturn {
  const { user } = useAuth();
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if already registered on mount
  useEffect(() => {
    const checkRegistration = async () => {
      if (!isNative || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if we have a stored token for this user
        const { data } = await supabase
          .from('push_subscriptions')
          .select('endpoint')
          .eq('user_id', user.id)
          .like('endpoint', 'native://%')
          .single();

        if (data) {
          setIsRegistered(true);
          setToken(data.endpoint.replace('native://', ''));
        }
      } catch (err) {
        console.error('Error checking native push registration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistration();
  }, [isNative, user]);

  // Set up notification listeners
  useEffect(() => {
    if (!isNative) return;

    // Handle registration success
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setToken(token.value);
      
      if (user) {
        // Store the token in the database
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: `native://${token.value}`,
            p256dh: 'native',
            auth: Capacitor.getPlatform(), // 'ios' or 'android'
          }, {
            onConflict: 'user_id,endpoint',
          });

        if (dbError) {
          console.error('Error storing push token:', dbError);
          setError('Failed to save push token');
        } else {
          setIsRegistered(true);
        }
      }
    });

    // Handle registration errors
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
      setError(err.error || 'Registration failed');
      setIsRegistered(false);
    });

    // Handle incoming notifications when app is in foreground
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // You can show an in-app notification here
    });

    // Handle notification tap
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      // Navigate based on notification data
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isNative, user]);

  const register = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      setError('Not running on a native platform');
      return false;
    }

    if (!user) {
      setError('User not logged in');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        setError('Push notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Register with the push service
      await PushNotifications.register();
      
      // Token will be received via the 'registration' listener
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error registering for push:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
      return false;
    }
  }, [isNative, user]);

  const unregister = useCallback(async (): Promise<boolean> => {
    if (!isNative || !user) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .like('endpoint', 'native://%');

      // Unregister from push service
      await PushNotifications.unregister();

      setIsRegistered(false);
      setToken(null);
      return true;
    } catch (err) {
      console.error('Error unregistering from push:', err);
      setError(err instanceof Error ? err.message : 'Unregister failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isNative, user]);

  return {
    isNative,
    isRegistered,
    isLoading,
    token,
    register,
    unregister,
    error,
  };
}
