import { logger } from '@pawmeet/utils';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { api } from '@/lib/trpc';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const notificationListener =
    useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>(null);
  const responseListener =
    useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>(null);
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications();

    // Reset badge count when the app is opened
    Notifications.setBadgeCountAsync(0).catch(() => {
      /* fire-and-forget */
    });

    // Listen for incoming notifications (app in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Push', 'Notification received', notification.request.content);
    });

    // Listen for notification taps (navigate to relevant screen)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // Clear badge on tap
      Notifications.setBadgeCountAsync(0).catch(() => {
        /* fire-and-forget */
      });

      const data = response.notification.request.content.data;

      if (data?.type === 'walk_overdue' && data?.walkId) {
        router.push('/(tabs)/map/walks');
        return;
      }

      if (data?.type === 'walk_sos' && data?.walkId) {
        router.push('/(tabs)/map/walks');
        return;
      }

      if (data?.type === 'event_reminder' && data?.eventId) {
        router.push(`/(tabs)/map/events/${data.eventId}`);
        return;
      }

      if (data?.type === 'support_reply' && data?.ticketId) {
        router.push(`/(modals)/support-chat?ticketId=${data.ticketId}`);
        return;
      }

      if (data?.matchId) {
        router.push(`/(tabs)/chat/${data.matchId}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [router]);
}

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    logger.debug('Push', 'Not a physical device, skipping push registration');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.info('Push', 'Permission not granted');
    return;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  // Send token to backend
  api.users.registerPushToken
    .mutate({ token: tokenData.data })
    .catch((e: unknown) => logger.warn('Push', 'Failed to register push token', e));
}
