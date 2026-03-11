import type { RouterOutput } from '@dogwalk/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useActivityStats } from '@/hooks/useActivityStats';
import { api } from '@/lib/trpc';

type Dog = RouterOutput['dogs']['list']['dogs'][number];

export function useActivityViewModel() {
  const router = useRouter();
  const { stats, healthGoal, loading, period, fetchStats, fetchHealthGoal, changePeriod } =
    useActivityStats();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);

  const loadDogs = useCallback(async () => {
    try {
      const { dogs: result } = await api.dogs.list.query();
      setDogs(result);
      if (result.length > 0 && result[0]) {
        setSelectedDogId(result[0].id);
        void fetchHealthGoal(result[0].id);
      }
    } catch {
      // Ignore
    }
  }, [fetchHealthGoal]);

  useEffect(() => {
    void fetchStats();
    void loadDogs();
  }, [fetchStats, loadDogs]);

  const selectDog = useCallback(
    (dogId: string) => {
      setSelectedDogId(dogId);
      void fetchHealthGoal(dogId);
    },
    [fetchHealthGoal],
  );

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    stats,
    healthGoal,
    loading,
    period,
    dogs,
    selectedDogId,
    changePeriod,
    selectDog,
    goBack,
    refresh: fetchStats,
  };
}
