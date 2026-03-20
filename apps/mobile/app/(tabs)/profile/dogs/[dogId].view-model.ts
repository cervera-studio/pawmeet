import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useBadges } from '@/hooks/useBadges';
import { useFeedback } from '@/hooks/useFeedback';
import { useImageUpload } from '@/hooks/useImageUpload';
import { isValidUUID } from '@/lib/deep-link-validation';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

export const MAX_PHOTOS = 6;

export function label(value: string): string {
  const key = `labels.${value}`;
  const translated = i18n.t(key);
  // If key not found, i18n returns the key itself — fall back to raw value
  return translated === key ? value : translated;
}

export function useDogDetailViewModel() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const [paramError, setParamError] = useState<string | null>(null);

  // Validate deep link param
  useEffect(() => {
    if (params.dogId && !isValidUUID(params.dogId)) {
      setParamError(t('profile.dogDetail.invalidId'));
    }
  }, [params.dogId, t]);

  const validDogId = params.dogId && isValidUUID(params.dogId) ? params.dogId : undefined;

  const storeDog = useDogsStore((s) => s.dogs.find((d) => d.id === validDogId));
  const updateDogInStore = useDogsStore((s) => s.updateDog);
  const removeDogFromStore = useDogsStore((s) => s.removeDog);
  const [dog, setDog] = useState<Dog | null>(storeDog ?? null);
  const [photos, setPhotos] = useState<DogPhoto[]>([]);
  const [loading, setLoading] = useState(!storeDog);
  const [deleting, setDeleting] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const { uploading, uploadDogPhoto } = useImageUpload();
  const { badges, fetchBadges } = useBadges();
  const { dogRating, fetchDogRating } = useFeedback();

  useEffect(() => {
    if (validDogId) {
      api.dogs.get
        .query({ id: validDogId })
        .then(({ dog: d, photos: p }) => {
          setDog(d);
          setPhotos(p);
          setLoading(false);
        })
        .catch((e) => {
          logger.warn('DogDetail', 'Failed to fetch dog', e);
          setLoading(false);
        });
      fetchBadges(validDogId);
      fetchDogRating(validDogId);
    }
  }, [validDogId, fetchBadges, fetchDogRating]);

  const handleUploadPhoto = useCallback(async () => {
    if (!dog) return;
    const photo = await uploadDogPhoto(dog.id);
    if (photo) {
      setPhotos((prev) => [...prev, photo]);
    }
  }, [dog, uploadDogPhoto]);

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      if (!dog) return;
      Alert.alert(t('profile.dogDetail.deletePhoto'), t('profile.dogDetail.deletePhotoConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingPhotoId(photoId);
            try {
              await api.dogs.deletePhoto.mutate({ dogId: dog.id, photoId });
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            } catch (e) {
              logger.warn('DogDetail', 'Failed to delete photo', e);
              Alert.alert(t('common.error'), t('profile.dogDetail.deletePhotoError'));
            } finally {
              setDeletingPhotoId(null);
            }
          },
        },
      ]);
    },
    [dog, t],
  );

  const handleToggleActive = useCallback(async () => {
    if (!dog) return;
    try {
      if (dog.isActive) {
        await api.dogs.delete.mutate({ id: dog.id });
        setDog({ ...dog, isActive: false });
        updateDogInStore(dog.id, { isActive: false });
        return;
      }
      // Reactivation not yet supported via tRPC
    } catch (e) {
      logger.warn('DogDetail', 'Failed to toggle active status', e);
    }
  }, [dog, updateDogInStore]);

  const handleDelete = useCallback(async () => {
    if (!dog) return;
    setDeleting(true);
    try {
      await api.dogs.delete.mutate({ id: dog.id });
      removeDogFromStore(dog.id);
      router.back();
    } catch (e) {
      logger.warn('DogDetail', 'Failed to delete dog', e);
      setDeleting(false);
    }
  }, [dog, removeDogFromStore, router]);

  const navigateToEdit = useCallback(() => {
    if (!validDogId) return;
    router.push(`/(modals)/edit-dog?dogId=${validDogId}`);
  }, [validDogId, router]);

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return {
    dog,
    paramError,
    photos,
    loading,
    deleting,
    deletingPhotoId,
    uploading,
    badges,
    dogRating,
    primaryPhoto,
    handleUploadPhoto,
    handleDeletePhoto,
    handleToggleActive,
    handleDelete,
    navigateToEdit,
  };
}
