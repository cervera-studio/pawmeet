import '../global.css';

import * as Sentry from '@sentry/react-native';
import { StatsigProviderExpo } from '@statsig/expo-bindings';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import '@/repositories/container';
import { useAuthStore } from '@/stores/auth';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enabled: !__DEV__,
});

SplashScreen.preventAutoHideAsync();

/** Registers for push notifications only when user is authenticated. */
function PushNotificationRegistration() {
  usePushNotifications();
  return null;
}

/** Hides splash screen once auth state has been hydrated from MMKV. */
function SplashController() {
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

const STATSIG_CLIENT_KEY = process.env.EXPO_PUBLIC_STATSIG_CLIENT_KEY ?? '';

function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);

  const statsigUser = useMemo(() => ({ userID: userId ?? undefined }), [userId]);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatsigProviderExpo sdkKey={STATSIG_CLIENT_KEY} user={statsigUser}>
          <SplashController />
          {isAuthenticated && <PushNotificationRegistration />}
          <StatusBar style="auto" />
          <Stack>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(modals)/dog-detail"
                options={{ presentation: 'modal', title: 'Dettaglio Cane' }}
              />
              <Stack.Screen
                name="(modals)/settings"
                options={{ presentation: 'modal', title: 'Impostazioni' }}
              />
              <Stack.Screen
                name="(modals)/report"
                options={{ presentation: 'modal', title: 'Segnala' }}
              />
            </Stack.Protected>
          </Stack>
        </StatsigProviderExpo>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
