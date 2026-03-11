import { loginSchema } from '@dogwalk/validation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import {
  extractGoogleIdToken,
  type SocialAuthResult,
  signInWithApple,
  useGoogleAuth,
} from '@/lib/social-auth';
import { zodToFieldErrors } from '@/lib/validation';

export function useLoginViewModel() {
  const router = useRouter();
  const { login, socialLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const google = useGoogleAuth();

  const handleSocialAuth = useCallback(
    async (result: SocialAuthResult) => {
      setApiError('');
      setLoading(true);
      try {
        await socialLogin(result.provider, result.idToken, result.displayName);
      } catch (e) {
        setApiError(e instanceof Error ? e.message : 'Errore durante il login social');
      } finally {
        setLoading(false);
      }
    },
    [socialLogin],
  );

  // Handle Google auth response
  useEffect(() => {
    const result = extractGoogleIdToken(google.response);
    if (result) {
      handleSocialAuth(result);
    }
  }, [google.response, handleSocialAuth]);

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
      setApiError(e instanceof Error ? e.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  }, [email, password, login]);

  const handleGoogleLogin = useCallback(async () => {
    setApiError('');
    try {
      await google.promptAsync();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Errore con Google Sign In');
    }
  }, [google]);

  const handleAppleLogin = useCallback(async () => {
    try {
      const result = await signInWithApple();
      await handleSocialAuth(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('ERR_REQUEST_CANCELED')) return;
      setApiError(message || 'Errore con Apple Sign In');
    }
  }, [handleSocialAuth]);

  const navigateToRegister = useCallback(() => {
    router.push('/(auth)/register');
  }, [router]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    apiError,
    loading,
    handleLogin,
    handleGoogleLogin,
    handleAppleLogin,
    showAppleLogin: Platform.OS === 'ios',
    googleReady: google.request !== null,
    navigateToRegister,
  };
}
