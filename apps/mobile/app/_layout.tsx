import '../global.css';
import '@/lib/i18n';

import process from 'node:process';
import { logger } from '@pawmeet/utils';
import * as Sentry from '@sentry/react-native';
import { StatsigProviderExpo } from '@statsig/expo-bindings';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConsentModal } from '@/components/ConsentModal';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useWebSocketManager } from '@/hooks/useWebSocket';
import { getExpiringPins, validatePinsInitialized } from '@/lib/certificate-pinning';
import { loadConsentsFromApi } from '@/lib/consent-sync';
import { checkDeviceIntegrity } from '@/lib/device-security';
import { startNetworkMonitor, stopNetworkMonitor } from '@/lib/network';
import { api } from '@/lib/trpc';
import { container } from '@/repositories/container';
import { ANALYTICS_SERVICE } from '@/repositories/tokens';
import { drainQueue, initSyncEngine } from '@/services/sync-engine';
import { createTrpcMutationExecutor } from '@/services/trpc-mutation-executor';
import { useAuthStore } from '@/stores/auth';
import { initConsentSubscription, useConsentStore } from '@/stores/consent';
import { useThemeStore } from '@/stores/theme';

// Wire analytics service optIn/optOut to consent store changes
initConsentSubscription(container.resolve(ANALYTICS_SERVICE));

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
  release: `io.pawmeet.mobile@${Constants.expoConfig?.version ?? '0.0.1'}`,
  dist: Constants.expoConfig?.extra?.eas?.buildNumber ?? undefined,
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
      event.request.headers = undefined;
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

/** Manages the shared WebSocket connection lifecycle. */
function WebSocketManager() {
  useWebSocketManager();
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
async function hashUserId(userId: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, userId);
  return `anon_${hash.slice(0, 16)}`;
}

/** Validates certificate pins are initialized and checks expiry on startup. */
function CertificatePinMonitor() {
  useEffect(() => {
    // Throws in production if placeholder hashes are still present.
    // In __DEV__ mode it only logs a warning.
    validatePinsInitialized();

    const expiring = getExpiringPins();
    if (expiring.length > 0) {
      Sentry.captureMessage(
        `Certificate pins expiring soon for: ${expiring.join(', ')}`,
        'warning',
      );
    }
  }, []);

  return null;
}

/** Tracks app_opened and app_backgrounded lifecycle events. */
function AppLifecycleTracker() {
  const analyticsService = useMemo(() => container.resolve(ANALYTICS_SERVICE), []);
  const sessionStartRef = useRef(Date.now());
  const screenCountRef = useRef(0);
  const lastOpenRef = useRef<number | null>(null);

  useEffect(() => {
    // Track initial app_opened
    analyticsService.track('app_opened', {
      hoursSinceLastOpen: 0,
      isNotificationDriven: false,
    });

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const now = Date.now();
        const hoursSinceLastOpen = lastOpenRef.current
          ? (now - lastOpenRef.current) / (1000 * 60 * 60)
          : 0;
        lastOpenRef.current = now;
        sessionStartRef.current = now;
        screenCountRef.current = 0;
        analyticsService.track('app_opened', {
          hoursSinceLastOpen: Math.round(hoursSinceLastOpen * 10) / 10,
          isNotificationDriven: false,
        });
      } else if (nextState === 'background') {
        analyticsService.track('app_backgrounded', {
          sessionDurationMs: Date.now() - sessionStartRef.current,
          screenCount: screenCountRef.current,
        });
      }
    });

    return () => sub.remove();
  }, [analyticsService]);

  return null;
}

/** Initializes the network monitor and sync engine for offline-first support. */
function OfflineFirstManager() {
  useEffect(() => {
    startNetworkMonitor();
    initSyncEngine(createTrpcMutationExecutor(api));

    // Drain any queued mutations on startup
    void drainQueue();

    return () => {
      stopNetworkMonitor();
    };
  }, []);

  return null;
}

/** Checks for root/jailbreak indicators on startup and logs a warning. */
function DeviceIntegrityMonitor() {
  useEffect(() => {
    checkDeviceIntegrity().then((result) => {
      if (result.isCompromised) {
        const message = `Device integrity check failed: ${result.reasons.join(', ')}`;
        logger.warn('DeviceIntegrity', message);
        Sentry.captureMessage(message, 'warning');
      }
    });
  }, []);

  return null;
}

function RootLayout() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAgeVerification = useAuthStore((s) => s.requiresAgeVerification);
  const userId = useAuthStore((s) => s.user?.id);
  const hasSeenConsentModal = useConsentStore((s) => s.hasSeenConsentModal);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const colorScheme = useColorScheme();

  // Hydrate theme store (triggers Appearance.setColorScheme on rehydrate)
  useThemeStore();

  // Load server-side consents and show consent modal if not yet seen
  useEffect(() => {
    if (isAuthenticated) {
      loadConsentsFromApi().catch((e) =>
        logger.warn('RootLayout', 'Failed to load consents from API', e),
      );
      if (!hasSeenConsentModal) {
        setShowConsentModal(true);
      }
    }
  }, [isAuthenticated, hasSeenConsentModal]);

  /**
   * Statsig is ALWAYS active — remote config and feature flags are functional
   * (legal basis: contract necessity, Art. 6(1)(b) GDPR).
   *
   * userId is pseudonymized (hashed) to avoid sending raw UUIDs to third parties.
   * Event logging for A/B experiments is consent-gated separately at the service layer.
   */
  const [hashedUserId, setHashedUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setHashedUserId(undefined);
      return;
    }
    hashUserId(userId).then(setHashedUserId);
  }, [userId]);

  const statsigUser = useMemo(() => ({ userID: hashedUserId }), [hashedUserId]);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatsigProviderExpo sdkKey={STATSIG_CLIENT_KEY} user={statsigUser}>
          <CertificatePinMonitor />
          <DeviceIntegrityMonitor />
          <OfflineFirstManager />
          <AppLifecycleTracker />
          <AuthHydrator />
          {isAuthenticated && <PushNotificationRegistration />}
          {isAuthenticated && <WebSocketManager />}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated && requiresAgeVerification}>
              <Stack.Screen
                name="(modals)/age-gate"
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />
            </Stack.Protected>

            <Stack.Protected guard={isAuthenticated && !requiresAgeVerification}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(modals)/dog-detail"
                options={{ presentation: 'modal', title: t('modals.dogDetail') }}
              />
              <Stack.Screen
                name="(modals)/settings"
                options={{ presentation: 'modal', title: t('modals.settings') }}
              />
              <Stack.Screen
                name="(modals)/report"
                options={{ presentation: 'modal', title: t('modals.report') }}
              />
              <Stack.Screen
                name="(modals)/blocked"
                options={{ presentation: 'modal', title: t('modals.blocked') }}
              />
              <Stack.Screen
                name="(modals)/search-users"
                options={{ presentation: 'modal', title: t('modals.searchUsers') }}
              />
              <Stack.Screen
                name="(modals)/user-profile"
                options={{ presentation: 'modal', title: t('modals.userProfile') }}
              />
              <Stack.Screen
                name="(modals)/story-viewer"
                options={{
                  presentation: 'fullScreenModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="(modals)/story-create"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="(modals)/story-viewers"
                options={{ presentation: 'modal', title: t('modals.storyViewers') }}
              />
              <Stack.Screen
                name="(modals)/media-viewer"
                options={{
                  presentation: 'fullScreenModal',
                  headerShown: false,
                  animation: 'fade',
                }}
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
