import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';

const RESEND_COOLDOWN_SECONDS = 60;

export function useVerifyEmailViewModel() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [apiError, setApiError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdown > 0]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6 || !email) return;

    setApiError('');
    setLoading(true);
    try {
      await api.auth.verifyEmailOtp.mutate({ email, code: otp });
      router.replace('/(tabs)');
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.verifyEmail.verifyError'));
    } finally {
      setLoading(false);
    }
  }, [otp, email, router]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || !email) return;

    setApiError('');
    setResending(true);
    try {
      await api.auth.resendVerification.mutate({ email });
      setCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.verifyEmail.resendError'));
    } finally {
      setResending(false);
    }
  }, [countdown, email]);

  return {
    email: email ?? '',
    otp,
    setOtp,
    loading,
    resending,
    apiError,
    countdown,
    canVerify: otp.length === 6 && !loading,
    handleVerify,
    handleResend,
  };
}
