import { formatDogAge, logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

export { formatDogAge };

export function useProfileViewModel() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const dogs = useDogsStore((s) => s.dogs);
  const setDogs = useDogsStore((s) => s.setDogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const setSelectedDog = useDogsStore((s) => s.setSelectedDog);
  const { uploading, uploadAvatar } = useImageUpload();
  const [loadingDogs, setLoadingDogs] = useState(true);

  useEffect(() => {
    api.dogs.list
      .query()
      .then(({ dogs: data }) => setDogs(data))
      .catch((e) => logger.warn('ProfileScreen', 'Failed to fetch dogs', e))
      .finally(() => setLoadingDogs(false));
  }, [setDogs]);

  const handleAvatarPress = async () => {
    await uploadAvatar();
  };

  const navigateToAddDog = () => {
    router.push('/(tabs)/profile/dogs/new');
  };

  const navigateToDogDetail = (dogId: string) => {
    router.push(`/(tabs)/profile/dogs/${dogId}`);
  };

  const navigateToSettings = () => {
    router.push('/(modals)/settings');
  };

  const isLoading = !user || loadingDogs;

  return {
    user,
    dogs,
    selectedDogId,
    setSelectedDog,
    uploading,
    isLoading,
    handleAvatarPress,
    navigateToAddDog,
    navigateToDogDetail,
    navigateToSettings,
    logout,
  };
}
