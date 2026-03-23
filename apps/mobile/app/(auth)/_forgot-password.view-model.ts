import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { zodToFieldErrors } from '@/lib/validation';

type Phase = 'request' | 'reset';

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

  const [phase, setPhase] = useState<Phase>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRequestReset = useCallback(async () => {
    setErrors({});
    setApiError('');

    const result = requestSchema.safeParse({ email });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    try {
      await api.auth.forgotPassword.mutate({ email });
      setPhase('reset');
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.forgotPassword.sendError'));
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleResetPassword = useCallback(async () => {
    setErrors({});
    setApiError('');

    const result = resetSchema.safeParse({ otp, newPassword, confirmPassword });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword.mutate({ email, code: otp, password: newPassword });
      router.replace('/(auth)/login');
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.forgotPassword.resetError'));
    } finally {
      setLoading(false);
    }
  }, [email, otp, newPassword, confirmPassword, router]);

  const handleResendCode = useCallback(async () => {
    if (resendDisabled) return;

    setApiError('');
    setResendDisabled(true);

    try {
      await api.auth.forgotPassword.mutate({ email });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('auth.forgotPassword.sendError'));
    }

    // Disable resend for 60 seconds
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    resendTimerRef.current = setTimeout(() => {
      setResendDisabled(false);
    }, 60_000);
  }, [email, resendDisabled]);

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
    navigateToLogin,
  };
}
