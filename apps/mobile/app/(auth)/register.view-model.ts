import { registerSchema } from '@dogwalk/validation';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { zodToFieldErrors } from '@/lib/validation';

export function useRegisterViewModel() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    setErrors({});
    setApiError('');

    // Check password confirmation first
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Le password non coincidono' });
      return;
    }

    const result = registerSchema.safeParse({ displayName, email, password });
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    try {
      await register(displayName, email, password);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  }, [displayName, email, password, confirmPassword, register]);

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
    errors,
    apiError,
    loading,
    handleRegister,
    navigateToLogin,
  };
}
