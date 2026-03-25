import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useChallenges } from '@/hooks/useGamification';

export function useChallengesViewModel() {
  const router = useRouter();
  const { challenges, loading, fetchChallenges } = useChallenges();

  useEffect(() => {
    void fetchChallenges();
  }, [fetchChallenges]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    challenges,
    loading,
    goBack,
    refresh: fetchChallenges,
  };
}
