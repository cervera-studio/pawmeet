import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useWalkSuggestions } from '@/hooks/useWalkSuggestions';
import i18n from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { useDogsStore } from '@/stores/dogs';

export function useWalkSuggestionsViewModel() {
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const dogs = useDogsStore((s) => s.dogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const { suggestions, loading, fetchSuggestions } = useWalkSuggestions();

  const hasDogs = dogs.length > 0;
  const activeDogId = selectedDogId ?? dogs[0]?.id ?? null;

  const fetch = useCallback(() => {
    if (!activeDogId) return;
    fetchSuggestions(activeDogId).catch((e) => {
      logger.warn('WalkSuggestions', 'Failed to fetch suggestions', e);
      Alert.alert(i18n.t('common.error'), i18n.t('walks.suggestions.fetchError'));
    });
  }, [activeDogId, fetchSuggestions]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isInitialLoad = loading && suggestions.length === 0;

  const activeDogName = useMemo(() => {
    const dog = dogs.find((d) => d.id === activeDogId);
    return dog?.name ?? '';
  }, [dogs, activeDogId]);

  return {
    userId,
    suggestions,
    loading,
    isInitialLoad,
    hasDogs,
    activeDogId,
    activeDogName,
    refresh: fetch,
  };
}
