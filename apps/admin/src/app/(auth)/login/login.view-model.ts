'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useState } from 'react';
import { useAuthContext } from '@/lib/auth-store';

type LoginStep = 'credentials' | 'mfa';

export function useLoginViewModel() {
  const router = useRouter();
  const { login, verifyMfa, isAuthenticated, isLoading: isAuthLoading } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<LoginStep>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        if (step === 'credentials') {
          const result = await login(email, password);
          if (result === 'mfa_required') {
            setStep('mfa');
            setMfaCode('');
          } else {
            router.push('/');
          }
        } else {
          await verifyMfa(mfaCode);
          router.push('/');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'generic';
        if (step === 'mfa') {
          if (message.includes('scaduto')) {
            setError('mfaExpired');
            setStep('credentials');
            setMfaCode('');
          } else {
            setError('mfaInvalid');
          }
        } else if (message.includes('401') || message.includes('Credenziali')) {
          setError('invalidCredentials');
        } else if (message.includes('403') || message.includes('disattivato')) {
          setError('accountDisabled');
        } else if (message.includes('423') || message.includes('bloccato')) {
          setError('accountLocked');
        } else {
          setError('serverError');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, mfaCode, step, login, verifyMfa, router],
  );

  const goBackToCredentials = useCallback(() => {
    setStep('credentials');
    setMfaCode('');
    setError(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    mfaCode,
    setMfaCode,
    step,
    error,
    isSubmitting,
    isAuthenticated,
    isAuthLoading,
    handleSubmit,
    goBackToCredentials,
  };
}
