import type { RouterOutput } from '@pawmeet/api-client';
import {
  BEHAVIOR_DOGS_OPTIONS,
  BEHAVIOR_PEOPLE_OPTIONS,
  ENERGY_OPTIONS,
  GENDER_OPTIONS,
  LEASH_OPTIONS,
  RECALL_OPTIONS,
  SIZE_OPTIONS,
  TERRAIN_OPTIONS,
  WALK_TIME_OPTIONS,
} from '@pawmeet/config';
import type {
  BehaviorWithDogs,
  BehaviorWithPeople,
  DogSize,
  EnergyLevel,
  Gender,
  LeashBehavior,
  RecallReliability,
  WalkTerrain,
  WalkTime,
} from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useImageUpload } from '@/hooks/useImageUpload';
import { isValidUUID } from '@/lib/deep-link-validation';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

interface EditDogForm {
  name: string;
  breed: string;
  breedSecondary: string;
  bio: string;
  size: DogSize;
  gender: Gender;
  isNeutered: boolean;
  energyLevel: EnergyLevel;
  behaviorWithDogs: BehaviorWithDogs;
  behaviorWithPeople: BehaviorWithPeople;
  leashBehavior: LeashBehavior;
  recallReliability: RecallReliability | '';
  walkPrefTime: WalkTime[];
  walkPrefTerrain: WalkTerrain[];
  walkPrefDurationMin: string;
  walkPrefDurationMax: string;
}

function dogToForm(dog: Dog): EditDogForm {
  return {
    name: dog.name,
    breed: dog.breed,
    breedSecondary: dog.breedSecondary ?? '',
    bio: dog.bio ?? '',
    size: dog.size,
    gender: dog.gender,
    isNeutered: dog.isNeutered,
    energyLevel: dog.energyLevel,
    behaviorWithDogs: dog.behaviorWithDogs,
    behaviorWithPeople: dog.behaviorWithPeople,
    leashBehavior: dog.leashBehavior,
    recallReliability: dog.recallReliability ?? '',
    walkPrefTime: dog.walkPrefTime,
    walkPrefTerrain: dog.walkPrefTerrain,
    walkPrefDurationMin: String(dog.walkPrefDurationMin),
    walkPrefDurationMax: String(dog.walkPrefDurationMax),
  };
}

export {
  BEHAVIOR_DOGS_OPTIONS,
  BEHAVIOR_PEOPLE_OPTIONS,
  ENERGY_OPTIONS,
  GENDER_OPTIONS,
  LEASH_OPTIONS,
  RECALL_OPTIONS,
  SIZE_OPTIONS,
  TERRAIN_OPTIONS,
  WALK_TIME_OPTIONS,
};

export function useEditDogViewModel() {
  const params = useLocalSearchParams<{ dogId: string }>();
  const dogId = params.dogId && isValidUUID(params.dogId) ? params.dogId : undefined;
  const router = useRouter();
  const updateDogInStore = useDogsStore((s) => s.updateDog);

  const [dog, setDog] = useState<Dog | null>(null);
  const [photos, setPhotos] = useState<DogPhoto[]>([]);
  const [form, setForm] = useState<EditDogForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const { uploading, uploadDogPhoto } = useImageUpload();

  useEffect(() => {
    if (!dogId) return;
    api.dogs.get
      .query({ id: dogId })
      .then(({ dog: d, photos: p }) => {
        setDog(d);
        setPhotos(p);
        setForm(dogToForm(d));
      })
      .catch((e) => {
        logger.warn('EditDog', 'Failed to fetch dog', e);
        setApiError(i18n.t('common.actionFailed'));
      })
      .finally(() => setLoading(false));
  }, [dogId]);

  const setField = useCallback(<K extends keyof EditDogForm>(field: K, value: EditDogForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!(form && dogId)) return;

    setSaving(true);
    setApiError('');
    try {
      await api.dogs.update.mutate({
        id: dogId,
        data: {
          name: form.name,
          breed: form.breed,
          breedSecondary: form.breedSecondary || undefined,
          bio: form.bio || undefined,
          size: form.size,
          gender: form.gender,
          isNeutered: form.isNeutered,
          energyLevel: form.energyLevel,
          behaviorWithDogs: form.behaviorWithDogs,
          behaviorWithPeople: form.behaviorWithPeople,
          leashBehavior: form.leashBehavior,
          recallReliability: form.recallReliability || undefined,
          walkPrefTime: form.walkPrefTime,
          walkPrefTerrain: form.walkPrefTerrain,
          walkPrefDurationMin: Number(form.walkPrefDurationMin),
          walkPrefDurationMax: Number(form.walkPrefDurationMax),
        },
      });
      updateDogInStore(dogId, { name: form.name, breed: form.breed });
      router.back();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('dogForm.saveError'));
    } finally {
      setSaving(false);
    }
  }, [form, dogId, updateDogInStore, router]);

  const handleUploadPhoto = useCallback(async () => {
    if (!dogId) return;
    const photo = await uploadDogPhoto(dogId);
    if (photo) setPhotos((prev) => [...prev, photo]);
  }, [dogId, uploadDogPhoto]);

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      if (!dogId) return;
      Alert.alert(
        i18n.t('profile.dogDetail.deletePhoto'),
        i18n.t('profile.dogDetail.deletePhotoConfirm'),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await api.dogs.deletePhoto.mutate({ dogId, photoId });
                setPhotos((prev) => prev.filter((p) => p.id !== photoId));
              } catch (e) {
                logger.warn('EditDog', 'Failed to delete photo', e);
              }
            },
          },
        ],
      );
    },
    [dogId],
  );

  return {
    dog,
    form,
    photos,
    loading,
    saving,
    uploading,
    apiError,
    setField,
    handleSave,
    handleUploadPhoto,
    handleDeletePhoto,
  };
}
