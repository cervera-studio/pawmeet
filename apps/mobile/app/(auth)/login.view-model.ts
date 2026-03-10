import { loginSchema } from '@dogwalk/validation';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { zodToFieldErrors } from '@/lib/validation';

export function useLoginViewModel() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

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
    navigateToRegister,
  };
}
