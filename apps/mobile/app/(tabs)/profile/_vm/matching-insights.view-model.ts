import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/trpc';

type Dog = RouterOutput['dogs']['list']['dogs'][number];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

const DIMENSION_LABELS: Record<string, string> = {
  size: 'Taglia',
  energy: 'Energia',
  behavior: 'Comportamento',
  walk: 'Passeggiata',
  distance: 'Distanza',
  leash: 'Guinzaglio',
};

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
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDogs = useCallback(async () => {
    try {
      const { dogs: result } = await api.dogs.list.query();
      setDogs(result);
      if (result.length > 0 && result[0]) {
        setSelectedDogId(result[0].id);
      }
    } catch {
      // Ignore
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
          label: DIMENSION_LABELS[d.dimension] ?? d.dimension,
          weight: d.weight,
          percentage: `${Math.round(d.weight * 100)}%`,
        })),
        optimalTimes: data.optimalTimes.map((t) => ({
          label: `${DAY_NAMES[t.dayOfWeek] ?? '?'} ${String(t.hourOfDay).padStart(2, '0')}:00`,
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
