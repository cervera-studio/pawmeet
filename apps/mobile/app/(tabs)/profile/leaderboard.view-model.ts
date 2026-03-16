import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useGamification';

export function useLeaderboardViewModel() {
  const router = useRouter();
  const { user } = useAuth();
  const { entries, loading, type, fetchLeaderboard, changeType } = useLeaderboard();

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    entries,
    loading,
    type,
    currentUserId: user?.id ?? null,
    changeType,
    goBack,
    refresh: fetchLeaderboard,
  };
}
