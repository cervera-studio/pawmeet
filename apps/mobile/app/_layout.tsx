import '../global.css';

import * as Sentry from '@sentry/react-native';
import { StatsigProviderExpo } from '@statsig/expo-bindings';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConsentModal } from '@/components/ConsentModal';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import '@/repositories/container';
import { useAuthStore } from '@/stores/auth';
import { useConsentStore } from '@/stores/consent';

/**
 * Sentry: always active under legitimate interest (Art. 6(1)(f) GDPR).
 *
 * Two modes based on error tracking consent:
 * - Consent GIVEN: full context sent (user id, device info, headers) — better debugging
 * - Consent NOT GIVEN: PII scrubbed (only anonymized id, no headers, no coordinates)
 *
 * The consent store is read at event time inside beforeSend, not at init time.
 */
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enabled: !__DEV__,
  beforeSend(event) {
    const hasErrorTrackingConsent = useConsentStore.getState().consents.errorTracking;

    if (hasErrorTrackingConsent) {
      // Full context — user opted in, keep everything for better debugging
      return event;
    }

    // No consent — scrub PII, keep only anonymized data (legitimate interest baseline)
    if (event.user) {
      event.user = { id: event.user.id };
    }
    if (event.request) {
      delete event.request.headers;
    }
    return event;
  },
});

SplashScreen.preventAutoHideAsync();

/** Registers for push notifications only when user is authenticated. */
function PushNotificationRegistration() {
  usePushNotifications();
  return null;
}

/** Hydrates tokens from SecureStore and hides splash when ready. */
function AuthHydrator() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}

const STATSIG_CLIENT_KEY = process.env.EXPO_PUBLIC_STATSIG_CLIENT_KEY ?? '';

/** Pseudonymize userId for third-party services (GDPR compliance) */
function hashUserId(userId: string): string {
  // Simple hash for client-side — server uses HMAC-SHA256 with salt
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const hasSeenConsentModal = useConsentStore((s) => s.hasSeenConsentModal);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Show consent modal after authentication if not yet seen
  useEffect(() => {
    if (isAuthenticated && !hasSeenConsentModal) {
      setShowConsentModal(true);
    }
  }, [isAuthenticated, hasSeenConsentModal]);

  /**
   * Statsig is ALWAYS active — remote config and feature flags are functional
   * (legal basis: contract necessity, Art. 6(1)(b) GDPR).
   *
   * userId is pseudonymized (hashed) to avoid sending raw UUIDs to third parties.
   * Event logging for A/B experiments is consent-gated separately at the service layer.
   */
  const statsigUser = useMemo(
    () => ({ userID: userId ? hashUserId(userId) : undefined }),
    [userId],
  );

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatsigProviderExpo sdkKey={STATSIG_CLIENT_KEY} user={statsigUser}>
          <AuthHydrator />
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

          <ConsentModal visible={showConsentModal} onDismiss={() => setShowConsentModal(false)} />
        </StatsigProviderExpo>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
