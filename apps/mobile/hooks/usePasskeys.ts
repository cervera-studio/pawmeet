import { useCallback, useEffect, useState } from 'react';
import { create, get, isSupported } from 'react-native-passkeys';
import { container } from 'tsyringe';
import { storage } from '@/lib/storage';
import type { PasskeySummary } from '@/repositories/interfaces';
import { ANALYTICS_SERVICE, PASSKEY_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const passkeyRepo = container.resolve(PASSKEY_REPOSITORY);
const analyticsService = container.resolve(ANALYTICS_SERVICE);

export function usePasskeys() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supported = isSupported();

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
        analyticsService.track('passkey_registered', {});
      } catch (e) {
        const message = e instanceof Error ? e.message : '';
        if (!message.includes('cancel')) {
          setError(message || 'Registrazione passkey fallita');
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
          avatarUrl: null,
          dateOfBirth: null,
        },
        result.accessToken,
      );
      analyticsService.identify(result.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (!message.includes('cancel')) {
        setError(message || 'Login con passkey fallito');
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
      setError(e instanceof Error ? e.message : 'Eliminazione fallita');
    }
  }, []);

  return {
    passkeys,
    loading,
    error,
    supported,
    registerPasskey,
    loginWithPasskey,
    deletePasskey,
    clearError: () => setError(''),
  };
}
