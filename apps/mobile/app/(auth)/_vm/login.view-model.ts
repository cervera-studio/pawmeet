import { loginSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { usePasskeys } from '@/hooks/usePasskeys';
import i18n from '@/lib/i18n';
import {
  extractGoogleCode,
  type SocialAuthResult,
  signInWithApple,
  useGoogleAuth,
} from '@/lib/social-auth';
import { zodToFieldErrors } from '@/lib/validation';

type LoginStep = 'email' | 'credentials';

export function useLoginViewModel() {
  const router = useRouter();
  const { login, socialLogin } = useAuth();
  const passkeys = usePasskeys();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyAttempted, setPasskeyAttempted] = useState(false);

  const google = useGoogleAuth();

  const handleSocialAuth = useCallback(
    async (result: SocialAuthResult) => {
      setApiError('');
      setLoading(true);
      try {
        await socialLogin(result.provider, result.idToken, result.displayName);
      } catch (e) {
        setApiError(e instanceof Error ? e.message : i18n.t('auth.login.socialLoginError'));
      } finally {
        setLoading(false);
      }
    },
    [socialLogin],
  );

  // Handle Google auth response (PKCE: exchange code server-side)
  useEffect(() => {
    const result = extractGoogleCode(google.response, google.request, google.redirectUri);
    if (result) {
      setApiError('');
      setLoading(true);
      socialLogin(
        result.provider,
        undefined,
        undefined,
        result.code,
        result.codeVerifier,
        result.redirectUri,
      )
        .catch((e) =>
          setApiError(e instanceof Error ? e.message : i18n.t('auth.login.googleError')),
        )
        .finally(() => setLoading(false));
    }
  }, [google.response, google.request, google.redirectUri, socialLogin]);

  // Step 1: user enters email and taps "Continue"
  // If passkey is available → auto-trigger passkey auth
  // If not → show password field
  const handleContinue = useCallback(async () => {
    setErrors({});
    setApiError('');

    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: i18n.t('validation.required') });
      return;
    }

    // If user has a registered passkey, try it automatically
    if (passkeys.showPasskeyOnLogin && !passkeyAttempted) {
      setLoading(true);
      setPasskeyAttempted(true);
      try {
        await passkeys.loginWithPasskey(trimmed);
        return; // success — auth hook will navigate
      } catch {
        // Passkey failed (cancelled, new device, etc.) — fall through to password
      } finally {
        setLoading(false);
      }
    }

    // Show password step
    setStep('credentials');
  }, [email, passkeys, passkeyAttempted]);

  const handleBack = useCallback(() => {
    setStep('email');
    setPassword('');
    setErrors({});
    setApiError('');
    setPasskeyAttempted(false);
  }, []);

  const handleLogin = useCallback(async () => {
    setErrors({});
    setApiError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.login.loginError'));
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  const handleGoogleLogin = useCallback(async () => {
    setApiError('');
    try {
      await google.promptAsync();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.login.googleError'));
    }
  }, [google]);

  const handleAppleLogin = useCallback(async () => {
    try {
      const result = await signInWithApple();
      await handleSocialAuth(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('ERR_REQUEST_CANCELED')) return;
      setApiError(message || i18n.t('auth.login.appleError'));
    }
  }, [handleSocialAuth]);

  const _handlePasskeyLogin = useCallback(async () => {
    setApiError('');
    setLoading(true);
    try {
      await passkeys.loginWithPasskey(email || undefined);
    } finally {
      setLoading(false);
    }
  }, [passkeys, email]);

  const navigateToRegister = useCallback(() => {
    router.replace('/(auth)/register');
  }, [router]);

  return {
    // Step state
    step,
    handleContinue,
    handleBack,

    // Form fields
    email,
    setEmail,
    password,
    setPassword,
    errors,
    apiError,
    loading,

    // Actions
    handleLogin,
    handleGoogleLogin,
    handleAppleLogin,

    // Feature flags
    showAppleLogin: Platform.OS === 'ios',
    googleReady: google.request !== null,
    navigateToRegister,
  };
}
