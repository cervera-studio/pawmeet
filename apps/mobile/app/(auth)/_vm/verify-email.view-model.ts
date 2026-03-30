import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApiError } from '@/hooks/useApiError';
import { api } from '@/lib/trpc';

const RESEND_COOLDOWN_SECONDS = 60;

export function useVerifyEmailViewModel() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { apiError, clearErrors, execute } = useApiError();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
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
  }, [countdown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6 || !email) return;

    clearErrors();
    setLoading(true);
    const response = await execute(
      () => api.auth.verifyEmailOtp.mutate({ email, code: otp }),
      'verifyEmail',
    );
    setLoading(false);

    if (response !== undefined) {
      router.replace('/(tabs)');
    }
  }, [otp, email, router, clearErrors, execute]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || !email) return;

    clearErrors();
    setResending(true);
    const response = await execute(
      () => api.auth.resendVerification.mutate({ email }),
      'verifyEmail.resend',
    );
    setResending(false);

    if (response !== undefined) {
      setCountdown(RESEND_COOLDOWN_SECONDS);
    }
  }, [countdown, email, clearErrors, execute]);

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
