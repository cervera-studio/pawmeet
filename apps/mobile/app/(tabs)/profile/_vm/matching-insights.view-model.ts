import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/trpc';

type Dog = RouterOutput['dogs']['list']['dogs'][number];

interface OptimalTimeFormatted {
  label: string;
  score: number;
  nearbyActiveUsers: number;
}

interface DimensionFormatted {
  label: string;
  weight: number;
  percentage: string;
}

interface InsightsData {
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  matchRate: string;
  dimensions: DimensionFormatted[];
  optimalTimes: OptimalTimeFormatted[];
  variant: string | null;
}

export function useMatchingInsightsViewModel() {
  const router = useRouter();
  const { t } = useTranslation();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const dimensionLabels: Record<string, string> = {
    size: t('profile.matchingInsights.dimSize'),
    energy: t('profile.matchingInsights.dimEnergy'),
    behavior: t('profile.matchingInsights.dimBehavior'),
    walk: t('profile.matchingInsights.dimWalk'),
    distance: t('profile.matchingInsights.dimDistance'),
    leash: t('profile.matchingInsights.dimLeash'),
  };

  const dayNames = [
    t('common.days.sun'),
    t('common.days.mon'),
    t('common.days.tue'),
    t('common.days.wed'),
    t('common.days.thu'),
    t('common.days.fri'),
    t('common.days.sat'),
  ];

  const loadDogs = useCallback(async () => {
    try {
      const { dogs: result } = await api.dogs.list.query();
      setDogs(result);
      if (result.length > 0 && result[0]) {
        setSelectedDogId(result[0].id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const loadInsights = useCallback(async (dogId: string) => {
    setLoading(true);
    try {
      const result = await api.matchingAi.insights.query({ dogId });
      const data = result.insights;

      setInsights({
        totalSwipes: data.totalSwipes,
        totalLikes: data.totalLikes,
        totalMatches: data.totalMatches,
        matchRate: `${Math.round(data.matchRate * 100)}%`,
        dimensions: data.preferredDimensions.map((d) => ({
          label: dimensionLabels[d.dimension] ?? d.dimension,
          weight: d.weight,
          percentage: `${Math.round(d.weight * 100)}%`,
        })),
        optimalTimes: data.optimalTimes.map((t) => ({
          label: `${dayNames[t.dayOfWeek] ?? '?'} ${String(t.hourOfDay).padStart(2, '0')}:00`,
          score: t.score,
          nearbyActiveUsers: t.nearbyActiveUsers,
        })),
        variant: data.experimentVariant,
      });
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDogs();
  }, [loadDogs]);

  useEffect(() => {
    if (selectedDogId) {
      void loadInsights(selectedDogId);
    }
  }, [selectedDogId, loadInsights]);

  const selectDog = useCallback((dogId: string) => {
    setSelectedDogId(dogId);
  }, []);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    dogs,
    selectedDogId,
    insights,
    loading,
    selectDog,
    goBack,
  };
}
