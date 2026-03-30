import { loginSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useApiError } from '@/hooks/useApiError';
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
  const { apiError, clearErrors, execute } = useApiError();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [passkeyAttempted, setPasskeyAttempted] = useState(false);

  const google = useGoogleAuth();

  const handleSocialAuth = useCallback(
    async (result: SocialAuthResult) => {
      clearErrors();
      setLoading(true);
      await execute(
        () => socialLogin(result.provider, result.idToken, result.displayName),
        'login.social',
      );
      setLoading(false);
    },
    [socialLogin, clearErrors, execute],
  );

  // Handle Google auth response (PKCE: exchange code server-side)
  useEffect(() => {
    const result = extractGoogleCode(google.response, google.request, google.redirectUri);
    if (result) {
      clearErrors();
      setLoading(true);
      execute(
        () =>
          socialLogin(
            result.provider,
            undefined,
            undefined,
            result.code,
            result.codeVerifier,
            result.redirectUri,
          ),
        'login.google',
      ).finally(() => setLoading(false));
    }
  }, [google.response, google.request, google.redirectUri, socialLogin, clearErrors, execute]);

  // Step 1: user enters email and taps "Continue"
  // If passkey is available → auto-trigger passkey auth
  // If not → show password field
  const handleContinue = useCallback(async () => {
    setErrors({});
    clearErrors();

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
  }, [email, passkeys, passkeyAttempted, clearErrors]);

  const handleBack = useCallback(() => {
    setStep('email');
    setPassword('');
    setErrors({});
    clearErrors();
    setPasskeyAttempted(false);
  }, [clearErrors]);

  const handleLogin = useCallback(async () => {
    setErrors({});
    clearErrors();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    await execute(() => login(email, password), 'login.email');
    setLoading(false);
  }, [email, password, login, clearErrors, execute]);

  const handleGoogleLogin = useCallback(async () => {
    clearErrors();
    try {
      await google.promptAsync();
    } catch {
      // Google prompt failure is handled via the useEffect above
    }
  }, [google, clearErrors]);

  const handleAppleLogin = useCallback(async () => {
    try {
      const result = await signInWithApple();
      await handleSocialAuth(result);
    } catch (e) {
      // Apple cancellation is not an error
      if (e instanceof Error && e.message.includes('ERR_REQUEST_CANCELED')) return;
      await execute(() => Promise.reject(e), 'login.apple');
    }
  }, [handleSocialAuth, execute]);

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
