import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useXpSummary } from '@/hooks/useGamification';

export function useGamificationViewModel() {
  const router = useRouter();
  const { xpSummary, loading, fetchXpSummary } = useXpSummary();

  useEffect(() => {
    void fetchXpSummary();
  }, [fetchXpSummary]);

  const navigateToLeaderboard = useCallback(() => {
    router.push('/(tabs)/profile/leaderboard');
  }, [router]);

  const navigateToAchievements = useCallback(() => {
    router.push('/(tabs)/profile/achievements');
  }, [router]);

  const navigateToChallenges = useCallback(() => {
    router.push('/(tabs)/profile/challenges');
  }, [router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    xpSummary,
    loading,
    navigateToLeaderboard,
    navigateToAchievements,
    navigateToChallenges,
    goBack,
    refresh: fetchXpSummary,
  };
}
