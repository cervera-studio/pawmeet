import { logger } from '@pawmeet/utils';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { create, get, isSupported } from 'react-native-passkeys';
import { container } from 'tsyringe';
import { handleApiError } from '@/lib/error-handler';
import { passkeyFlag, storage } from '@/lib/storage';
import type { PasskeySummary } from '@/repositories/interfaces';
import { ANALYTICS_SERVICE, PASSKEY_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const passkeyRepo = container.resolve(PASSKEY_REPOSITORY);
const analyticsService = container.resolve(ANALYTICS_SERVICE);

/** Detect biometric type label key for i18n. */
async function detectBiometricLabelKey(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'auth.login.loginWithFaceId';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'auth.login.loginWithTouchId';
      }
    }
    if (Platform.OS === 'android') {
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'auth.login.loginWithFingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'auth.login.loginWithFaceId';
      }
    }
  } catch {
    // Fall through to generic
  }
  return 'auth.login.loginWithBiometrics';
}

export function usePasskeys() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState(() => passkeyFlag.get());
  const [passkeyHiddenForSession, setPasskeyHiddenForSession] = useState(false);
  const [biometricLabelKey, setBiometricLabelKey] = useState('auth.login.loginWithBiometrics');
  const supported = isSupported();

  // Detect biometric type on mount
  useEffect(() => {
    detectBiometricLabelKey().then(setBiometricLabelKey);
  }, []);

  const showPasskeyOnLogin = useMemo(
    () => supported && hasRegisteredPasskey && !passkeyHiddenForSession,
    [supported, hasRegisteredPasskey, passkeyHiddenForSession],
  );

  const loadPasskeys = useCallback(async () => {
    try {
      const list = await passkeyRepo.list();
      setPasskeys(list);
    } catch {
      // Silently fail — list is optional
    }
  }, []);

  useEffect(() => {
    if (supported) {
      loadPasskeys();
    }
  }, [supported, loadPasskeys]);

  const registerPasskey = useCallback(
    async (friendlyName?: string) => {
      setError('');
      setLoading(true);
      try {
        const options = await passkeyRepo.getRegisterOptions();
        const credential = await create(options as Parameters<typeof create>[0]);
        if (!credential) {
          setLoading(false);
          return;
        }
        await passkeyRepo.verifyRegistration(
          credential as unknown as Record<string, unknown>,
          friendlyName,
        );
        await loadPasskeys();
        passkeyFlag.set(true);
        setHasRegisteredPasskey(true);
        analyticsService.track('passkey_registered', {});
      } catch (e) {
        const isCancellation = e instanceof Error && e.message.includes('cancel');
        if (!isCancellation) {
          setError(handleApiError(e, 'registerPasskey').message);
        }
      } finally {
        setLoading(false);
      }
    },
    [loadPasskeys],
  );

  const loginWithPasskey = useCallback(async (email?: string) => {
    setError('');
    setLoading(true);
    try {
      const options = await passkeyRepo.getLoginOptions(email);
      const assertion = await get(options as Parameters<typeof get>[0]);
      if (!assertion) {
        setLoading(false);
        return;
      }
      const result = await passkeyRepo.verifyLogin(assertion as unknown as Record<string, unknown>);

      // Persist tokens — same as email/social login
      await storage.setToken(result.accessToken);
      await storage.setRefreshToken(result.refreshToken);
      useAuthStore.getState().login(
        {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName ?? result.user.email,
          avatarUrl: result.user.avatarUrl ?? null,
          dateOfBirth: result.user.dateOfBirth ?? null,
        },
        result.accessToken,
        result.user.onboardingCompletedAt != null,
      );
      analyticsService.identify(result.user.id);
    } catch (e) {
      const isCancellation = e instanceof Error && e.message.includes('cancel');
      if (!isCancellation) {
        // Silently hide the passkey button for this session (e.g. new phone,
        // credential not transferred). No user-facing error toast.
        // handleApiError ensures Sentry logging.
        handleApiError(e, 'loginWithPasskey');
        setPasskeyHiddenForSession(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePasskey = useCallback(async (id: string) => {
    setError('');
    try {
      await passkeyRepo.remove(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(handleApiError(e, 'deletePasskey').message);
    }
  }, []);

  return {
    passkeys,
    loading,
    error,
    supported,
    showPasskeyOnLogin,
    hasRegisteredPasskey,
    biometricLabelKey,
    registerPasskey,
    loginWithPasskey,
    deletePasskey,
    clearError: () => setError(''),
  };
}
