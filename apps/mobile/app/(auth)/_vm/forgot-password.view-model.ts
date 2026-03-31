import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import { useApiError } from '@/hooks/useApiError';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { zodToFieldErrors } from '@/lib/validation';

type Phase = 'request' | 'sent' | 'reset';

const requestSchema = z.object({
  email: z.string().email(i18n.t('auth.forgotPassword.invalidEmail')),
});

const resetSchema = z
  .object({
    otp: z
      .string()
      .length(6, i18n.t('auth.forgotPassword.codeRequired'))
      .regex(/^\d{6}$/, i18n.t('auth.forgotPassword.codeRequired')),
    newPassword: z.string().min(8, i18n.t('auth.forgotPassword.passwordTooShort')),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: i18n.t('auth.forgotPassword.passwordMismatch'),
    path: ['confirmPassword'],
  });

export function useForgotPasswordViewModel() {
  const router = useRouter();
  const { apiError, fieldErrors: serverFieldErrors, clearErrors, execute } = useApiError();

  const [phase, setPhase] = useState<Phase>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localFieldErrors, setLocalFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const errors = { ...localFieldErrors, ...serverFieldErrors };

  const handleRequestReset = useCallback(async () => {
    setLocalFieldErrors({});
    clearErrors();

    const result = requestSchema.safeParse({ email });
    if (!result.success) {
      setLocalFieldErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    const response = await execute(
      () => api.auth.forgotPassword.mutate({ email }),
      'forgotPassword.request',
    );
    setLoading(false);

    if (response !== undefined) {
      setPhase('sent');
    }
  }, [email, clearErrors, execute]);

  const handleResetPassword = useCallback(async () => {
    setLocalFieldErrors({});
    clearErrors();

    const result = resetSchema.safeParse({ otp, newPassword, confirmPassword });
    if (!result.success) {
      setLocalFieldErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    const response = await execute(
      () => api.auth.resetPassword.mutate({ email, code: otp, password: newPassword }),
      'forgotPassword.reset',
    );
    setLoading(false);

    if (response !== undefined) {
      router.replace('/(auth)/login');
    }
  }, [email, otp, newPassword, confirmPassword, router, clearErrors, execute]);

  const handleResendCode = useCallback(async () => {
    if (resendDisabled) return;

    clearErrors();
    setResendDisabled(true);

    await execute(() => api.auth.forgotPassword.mutate({ email }), 'forgotPassword.resend');

    // Disable resend for 60 seconds
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    resendTimerRef.current = setTimeout(() => {
      setResendDisabled(false);
    }, 60_000);
  }, [email, resendDisabled, clearErrors, execute]);

  const goToReset = useCallback(() => {
    setPhase('reset');
  }, []);

  const navigateToLogin = useCallback(() => {
    router.back();
  }, [router]);

  return {
    phase,
    email,
    setEmail,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    errors,
    apiError,
    loading,
    resendDisabled,
    handleRequestReset,
    handleResetPassword,
    handleResendCode,
    goToReset,
    navigateToLogin,
  };
}
