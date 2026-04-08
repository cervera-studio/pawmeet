import { formatDogAge, logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useXpSummary } from '@/hooks/useGamification';
import { useImageUpload } from '@/hooks/useImageUpload';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

export { formatDogAge };

export function useProfileViewModel() {
  const router = useRouter();
  const { user } = useAuth();
  const dogs = useDogsStore((s) => s.dogs);
  const setDogs = useDogsStore((s) => s.setDogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const setSelectedDog = useDogsStore((s) => s.setSelectedDog);
  const { uploading, uploadAvatar } = useImageUpload();
  const { xpSummary, fetchXpSummary } = useXpSummary();
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    api.dogs.list
      .query()
      .then(({ dogs: data }) => setDogs(data))
      .catch((e) => logger.warn('ProfileScreen', 'Failed to fetch dogs', e))
      .finally(() => setLoadingDogs(false));
  }, [setDogs]);

  // Fetch XP summary for gamification bar
  useEffect(() => {
    void fetchXpSummary();
  }, [fetchXpSummary]);

  // Fetch denormalized counts from user profile
  useEffect(() => {
    api.users.getProfile
      .query()
      .then((profile) => {
        setFollowCounts({
          followers: profile.followersCount ?? 0,
          following: profile.followingCount ?? 0,
        });
      })
      .catch((e) => logger.warn('ProfileScreen', 'Failed to fetch follow counts', e));
  }, []);

  const handleAvatarPress = async () => {
    await uploadAvatar();
  };

  const navigateToAddDog = () => {
    router.push('/(modals)/add-dog');
  };

  const navigateToDogDetail = (dogId: string) => {
    router.push(`/(tabs)/profile/dogs/${dogId}`);
  };

  const navigateToSettings = () => {
    router.push('/(modals)/settings');
  };

  const navigateToActivity = () => {
    router.push('/(tabs)/profile/activity');
  };

  const navigateToMatchingInsights = () => {
    router.push('/(tabs)/profile/matching-insights');
  };

  const navigateToFollowers = () => {
    router.push('/(tabs)/profile/followers');
  };

  const navigateToFollowing = () => {
    router.push('/(tabs)/profile/following');
  };

  const navigateToFriends = () => {
    router.push('/(tabs)/profile/friends');
  };

  const navigateToGamification = () => {
    router.push('/(tabs)/profile/gamification');
  };

  const navigateToPrivacy = () => {
    router.push('/(modals)/privacy');
  };

  const navigateToBlocked = () => {
    router.push('/(modals)/blocked');
  };

  const navigateToSearchUsers = () => {
    router.push('/(modals)/search-users');
  };

  const navigateToHelp = () => {
    Linking.openURL('https://pawmeet.io/help');
  };

  const isLoading = !user || loadingDogs;

  return {
    user,
    dogs,
    selectedDogId,
    setSelectedDog,
    uploading,
    isLoading,
    followCounts,
    handleAvatarPress,
    navigateToAddDog,
    navigateToDogDetail,
    navigateToSettings,
    navigateToActivity,
    navigateToMatchingInsights,
    xpSummary,
    navigateToFollowers,
    navigateToFollowing,
    navigateToFriends,
    navigateToGamification,
    navigateToPrivacy,
    navigateToBlocked,
    navigateToSearchUsers,
    navigateToHelp,
  };
}
