import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useBadges } from '@/hooks/useBadges';
import { useFeedback } from '@/hooks/useFeedback';
import { useImageUpload } from '@/hooks/useImageUpload';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

export const MAX_PHOTOS = 6;

export const LABEL_MAP: Record<string, string> = {
  toy: 'Toy',
  piccola: 'Piccola',
  media: 'Media',
  grande: 'Grande',
  gigante: 'Gigante',
  bassa: 'Bassa',
  alta: 'Alta',
  molto_alta: 'Molto alta',
  molto_socievole: 'Molto socievole',
  socievole: 'Socievole',
  selettivo: 'Selettivo',
  reattivo: 'Reattivo',
  timido: 'Timido',
  diffidente: 'Diffidente',
  eccellente: 'Eccellente',
  buono: 'Buono',
  in_addestramento: 'In addestramento',
  difficile: 'Difficile',
  affidabile: 'Affidabile',
  parziale: 'Parziale',
  non_affidabile: 'Non affidabile',
  maschio: 'Maschio',
  femmina: 'Femmina',
  mattina_presto: 'Mattina presto',
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
  sera_tardi: 'Sera tardi',
  urbano: 'Urbano',
  parco: 'Parco',
  campagna: 'Campagna',
  spiaggia: 'Spiaggia',
  montagna: 'Montagna',
};

export function label(value: string): string {
  return LABEL_MAP[value] ?? value;
}

export function useDogDetailViewModel() {
  const params = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const storeDog = useDogsStore((s) => s.dogs.find((d) => d.id === params.dogId));
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
    if (params.dogId) {
      api.dogs.get
        .query({ id: params.dogId })
        .then(({ dog: d, photos: p }) => {
          setDog(d);
          setPhotos(p);
          setLoading(false);
        })
        .catch((e) => {
          logger.warn('DogDetail', 'Failed to fetch dog', e);
          setLoading(false);
        });
      fetchBadges(params.dogId);
      fetchDogRating(params.dogId);
    }
  }, [params.dogId, fetchBadges, fetchDogRating]);

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
      Alert.alert('Elimina foto', 'Sei sicuro di voler eliminare questa foto?', [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            setDeletingPhotoId(photoId);
            try {
              await api.dogs.deletePhoto.mutate({ dogId: dog.id, photoId });
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            } catch (e) {
              logger.warn('DogDetail', 'Failed to delete photo', e);
              Alert.alert('Errore', 'Impossibile eliminare la foto. Riprova.');
            } finally {
              setDeletingPhotoId(null);
            }
          },
        },
      ]);
    },
    [dog],
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

  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return {
    dog,
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
  };
}
