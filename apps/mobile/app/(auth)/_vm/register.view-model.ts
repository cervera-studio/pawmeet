import { registerSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useApiError } from '@/hooks/useApiError';
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
  const { apiError, clearErrors, execute } = useApiError();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSocialAuth = useCallback(
    async (result: SocialAuthResult) => {
      clearErrors();
      setLoading(true);
      await execute(
        () => socialLogin(result.provider, result.idToken, result.displayName),
        'register.social',
      );
      setLoading(false);
    },
    [socialLogin, clearErrors, execute],
  );

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
        'register.google',
      ).finally(() => setLoading(false));
    }
  }, [google.response, google.request, google.redirectUri, socialLogin, clearErrors, execute]);

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
      if (e instanceof Error && e.message.includes('ERR_REQUEST_CANCELED')) return;
      await execute(() => Promise.reject(e), 'register.apple');
    }
  }, [handleSocialAuth, execute]);

  const handleRegister = useCallback(async () => {
    setErrors({});
    clearErrors();

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
    await execute(
      () => register(displayName, email, password, dobString),
      'register.email',
    );
    setLoading(false);
  }, [displayName, email, password, confirmPassword, dateOfBirth, register, clearErrors, execute]);

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
