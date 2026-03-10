'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useState } from 'react';
import { useAuthContext } from '@/lib/auth-store';

export function useLoginViewModel() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        await login(email, password);
        router.push('/');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Errore durante il login';
        // Provide user-friendly messages
        if (message.includes('401') || message.includes('Credenziali')) {
          setError('Email o password non validi');
        } else if (message.includes('403') || message.includes('disattivato')) {
          setError('Account disattivato. Contatta un amministratore.');
        } else {
          setError('Errore del server. Riprova più tardi.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, login, router],
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting,
    isAuthenticated,
    isAuthLoading,
    handleSubmit,
  };
}
