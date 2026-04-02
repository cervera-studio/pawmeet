import { dateOfBirthSchema } from '@pawmeet/validation';
import { useCallback, useState } from 'react';
import { container } from 'tsyringe';
import { handleApiError } from '@/lib/error-handler';
import { USER_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const userRepo = container.resolve(USER_REPOSITORY);

export function useAgeGateViewModel() {
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const dobString = dateOfBirth ? (dateOfBirth.toISOString().split('T')[0] ?? '') : '';
    const parsed = dateOfBirthSchema.safeParse(dobString);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(firstIssue?.message ?? 'Data non valida');
      return;
    }

    setLoading(true);
    try {
      await userRepo.submitDateOfBirth(dobString);
      const store = useAuthStore.getState();
      if (store.user) {
        store.setUser({ ...store.user, dateOfBirth: dobString });
      }
      store.clearAgeVerification();
    } catch (e) {
      setError(handleApiError(e, 'ageGate').message);
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
