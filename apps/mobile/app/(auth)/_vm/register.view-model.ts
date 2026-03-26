import { registerSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import {
  extractGoogleCode,
  type SocialAuthResult,
  signInWithApple,
  useGoogleAuth,
} from '@/lib/social-auth';
import { zodToFieldErrors } from '@/lib/validation';

export function useRegisterViewModel() {
  const router = useRouter();
  const { register, socialLogin } = useAuth();
  const google = useGoogleAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleRegister = useCallback(async () => {
    setErrors({});
    setApiError('');

    // Check password confirmation first
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: i18n.t('auth.register.passwordMismatch') });
      return;
    }

    const dobString = dateOfBirth ? (dateOfBirth.toISOString().split('T')[0] ?? '') : '';
    const result = registerSchema.safeParse({
      displayName,
      email,
      password,
      dateOfBirth: dobString,
    });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    try {
      await register(displayName, email, password, dobString);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.register.registerError'));
    } finally {
      setLoading(false);
    }
  }, [displayName, email, password, confirmPassword, dateOfBirth, register]);

  const navigateToLogin = useCallback(() => {
    router.replace('/(auth)/login');
  }, [router]);

  return {
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    dateOfBirth,
    setDateOfBirth,
    errors,
    apiError,
    loading,
    handleRegister,
    handleGoogleLogin,
    handleAppleLogin,
    showAppleLogin: Platform.OS === 'ios',
    googleReady: google.request !== null,
    navigateToLogin,
  };
}
