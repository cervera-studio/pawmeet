import { registerSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import { zodToFieldErrors } from '@/lib/validation';

export function useRegisterViewModel() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    setErrors({});
    setApiError('');

    // Check password confirmation first
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: i18n.t('auth.register.passwordMismatch') });
      return;
    }

    const dobString = dateOfBirth ? dateOfBirth.toISOString().split('T')[0] ?? '' : '';
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
    router.back();
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
    navigateToLogin,
  };
}
