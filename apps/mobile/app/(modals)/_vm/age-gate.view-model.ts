import { logger } from '@pawmeet/utils';
import { dateOfBirthSchema } from '@pawmeet/validation';
import { useCallback, useState } from 'react';
import { container } from 'tsyringe';
import { USER_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const userRepo = container.resolve(USER_REPOSITORY);

export function useAgeGateViewModel() {
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const parsed = dateOfBirthSchema.safeParse(dateOfBirth);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(firstIssue?.message ?? 'Data non valida');
      return;
    }

    setLoading(true);
    try {
      await userRepo.submitDateOfBirth(dateOfBirth);
      const store = useAuthStore.getState();
      if (store.user) {
        store.setUser({ ...store.user, dateOfBirth });
      }
      store.clearAgeVerification();
    } catch (e) {
      logger.warn('AgeGateVM', 'Submit failed', e);
      const message = e instanceof Error ? e.message : 'Errore imprevisto';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateOfBirth]);

  return {
    dateOfBirth,
    setDateOfBirth,
    error,
    loading,
    handleSubmit,
  };
}
