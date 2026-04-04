import type { DiscoveryFilters } from '@pawmeet/types';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useLocation } from '@/hooks/useLocation';
import { useMatching } from '@/hooks/useMatching';
import { useDogsStore } from '@/stores/dogs';

export function useDiscoveryViewModel() {
  const router = useRouter();
  const { coordinates, getCurrentLocation } = useLocation();
  const dogs = useDogsStore((s) => s.dogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const {
    currentProfile,
    nextProfile,
    isLoading,
    hasMore,
    newMatch,
    filters,
    activeFilterCount,
    setFilters,
    fetchSuggestions,
    swipeRight,
    swipeLeft,
    superLike,
    dismissMatch,
  } = useMatching();

  const handleApplyFilters = useCallback(
    (newFilters: DiscoveryFilters) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (coordinates && selectedDogId) {
      fetchSuggestions();
    }
  }, [coordinates, selectedDogId, fetchSuggestions]);

  const handleSwipeRight = useCallback(() => {
    if (currentProfile) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      swipeRight(currentProfile.dog.id);
    }
  }, [currentProfile, swipeRight]);

  const handleSwipeLeft = useCallback(() => {
    if (currentProfile) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      swipeLeft(currentProfile.dog.id);
    }
  }, [currentProfile, swipeLeft]);

  const handleSuperLike = useCallback(() => {
    if (currentProfile) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      superLike(currentProfile.dog.id);
    }
  }, [currentProfile, superLike]);

  const navigateToAddDog = useCallback(() => {
    router.push('/(tabs)/profile/dogs/new');
  }, [router]);

  const navigateToChat = useCallback(
    (matchId: string) => {
      router.push(`/(tabs)/chat/${matchId}`);
    },
    [router],
  );

  return {
    dogs,
    coordinates,
    getCurrentLocation,
    currentProfile,
    nextProfile,
    isLoading,
    hasMore,
    newMatch,
    filters,
    activeFilterCount,
    handleApplyFilters,
    handleSwipeRight,
    handleSwipeLeft,
    handleSuperLike,
    navigateToAddDog,
    navigateToChat,
    dismissMatch,
    fetchSuggestions,
  };
}
