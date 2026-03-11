import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useEffect } from 'react';
import { api } from '@/lib/trpc';

interface OptimalTimeWindow {
  dayOfWeek: number;
  hourOfDay: number;
  score: number;
  nearbyActiveUsers: number;
}

interface MatchingInsights {
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  matchRate: number;
  preferredDimensions: Array<{ dimension: string; weight: number }>;
  optimalTimes: OptimalTimeWindow[];
  experimentVariant: string | null;
}

export function useSmartMatching(dogId: string | null) {
  const [insights, setInsights] = useState<MatchingInsights | null>(null);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTimeWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const lastRecordedHour = useRef<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    try {
      const result = await api.matchingAi.insights.query({ dogId });
      setInsights(result.insights);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  const fetchOptimalTimes = useCallback(async () => {
    if (!dogId) return;
    try {
      const result = await api.matchingAi.optimalTimes.query({ dogId });
      setOptimalTimes(result.windows);
    } catch {
      // Ignore
    }
  }, [dogId]);

  const recordActivity = useCallback(async () => {
    const now = new Date();
    const key = `${now.getDay()}-${now.getHours()}`;
    // Avoid recording the same hour multiple times
    if (lastRecordedHour.current === key) return;
    lastRecordedHour.current = key;

    try {
      await api.matchingAi.recordActivity.mutate({
        dayOfWeek: now.getDay(),
        hourOfDay: now.getHours(),
      });
    } catch {
      // Ignore
    }
  }, []);

  const logSwipeScores = useCallback(
    async (
      targetDogId: string,
      direction: 'like' | 'pass',
      scores: {
        sizeScore: number;
        energyScore: number;
        behaviorScore: number;
        walkScore: number;
        distanceScore: number;
        leashScore: number;
        overallScore: number;
      },
    ) => {
      if (!dogId) return;
      try {
        await api.matchingAi.logSwipeScores.mutate({
          dogId,
          targetDogId,
          direction,
          scores,
        });
      } catch {
        // Non-blocking
      }
    },
    [dogId],
  );

  const learnPreferences = useCallback(async () => {
    try {
      await api.matchingAi.learnPreferences.mutate();
    } catch {
      // Ignore
    }
  }, []);

  // Record activity on app foreground
  useEffect(() => {
    void recordActivity();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void recordActivity();
      }
    });
    return () => sub.remove();
  }, [recordActivity]);

  return {
    insights,
    optimalTimes,
    loading,
    fetchInsights,
    fetchOptimalTimes,
    logSwipeScores,
    learnPreferences,
    recordActivity,
  };
}
