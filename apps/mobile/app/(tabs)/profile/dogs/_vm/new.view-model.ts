import { MAX_DOGS_PER_USER } from '@pawmeet/config';
import type {
  BehaviorWithDogs,
  BehaviorWithPeople,
  DogSize,
  EnergyLevel,
  Gender,
  LeashBehavior,
  WalkTerrain,
  WalkTime,
} from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { createDogSchema } from '@pawmeet/validation';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useReducer, useState } from 'react';
import { Alert } from 'react-native';
import { handleApiError } from '@/lib/error-handler';
import i18n from '@/lib/i18n';
import { uploadToPresignedUrl } from '@/lib/upload';
import { zodToFieldErrors } from '@/lib/validation';
import { container } from '@/repositories/container';
import type { MediaContentType } from '@/repositories/interfaces';
import { DOG_REPOSITORY, MEDIA_REPOSITORY } from '@/repositories/tokens';
import { useDogsStore } from '@/stores/dogs';

const dogRepo = container.resolve(DOG_REPOSITORY);
const mediaRepo = container.resolve(MEDIA_REPOSITORY);

// -- State shape --

interface PendingPhoto {
  uri: string;
  contentType: string;
  fileSize: number;
}

interface DogFormState {
  // Step 1: Basic info
  name: string;
  breed: string;
  breedSecondary: string;
  birthDate: string;
  weightKg: string;
  size: DogSize | null;
  gender: Gender | null;
  isNeutered: boolean | null;
  bio: string;

  // Step 2: Temperament
  energyLevel: EnergyLevel | null;
  behaviorWithDogs: BehaviorWithDogs | null;
  behaviorWithPeople: BehaviorWithPeople | null;
  leashBehavior: LeashBehavior | null;
  recallReliability: string | null;

  // Step 3: Walk preferences
  walkPrefTime: WalkTime[];
  walkPrefTerrain: WalkTerrain[];
  walkPrefDurationMin: string;
  walkPrefDurationMax: string;

  // Step 4: Photos (collected locally before dog creation)
  pendingPhotos: PendingPhoto[];
}

const initialState: DogFormState = {
  name: '',
  breed: '',
  breedSecondary: '',
  birthDate: '',
  weightKg: '',
  size: null,
  gender: null,
  isNeutered: null,
  bio: '',
  energyLevel: null,
  behaviorWithDogs: null,
  behaviorWithPeople: null,
  leashBehavior: null,
  recallReliability: null,
  walkPrefTime: [],
  walkPrefTerrain: [],
  walkPrefDurationMin: '30',
  walkPrefDurationMax: '60',
  pendingPhotos: [],
};

// -- Reducer --

type DogFormAction =
  | { type: 'SET_FIELD'; field: keyof DogFormState; value: DogFormState[keyof DogFormState] }
  | { type: 'ADD_PENDING_PHOTO'; photo: PendingPhoto }
  | { type: 'REMOVE_PENDING_PHOTO'; index: number };

function formReducer(state: DogFormState, action: DogFormAction): DogFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'ADD_PENDING_PHOTO':
      return { ...state, pendingPhotos: [...state.pendingPhotos, action.photo] };
    case 'REMOVE_PENDING_PHOTO':
      return { ...state, pendingPhotos: state.pendingPhotos.filter((_, i) => i !== action.index) };
    default:
      return state;
  }
}

// -- Validation helpers --

function validateStep0(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.name || state.name.length < 2) {
    errors.name = i18n.t('dogForm.validation.nameMinLength');
  }
  if (!state.breed) errors.breed = i18n.t('dogForm.validation.breedRequired');
  if (!state.birthDate) errors.birthDate = i18n.t('dogForm.validation.birthDateRequired');
  if (!state.weightKg || Number(state.weightKg) < 0.5) {
    errors.weightKg = i18n.t('dogForm.validation.weightInvalid');
  }
  if (state.size === null) errors.size = i18n.t('dogForm.validation.selectSize');
  if (!state.gender) errors.gender = i18n.t('dogForm.validation.selectGender');
  if (state.isNeutered === null) errors.isNeutered = i18n.t('dogForm.validation.neuteredRequired');
  return errors;
}

function validateStep1(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.energyLevel) errors.energyLevel = i18n.t('dogForm.validation.selectEnergy');
  if (!state.behaviorWithDogs) {
    errors.behaviorWithDogs = i18n.t('dogForm.validation.selectBehaviorDogs');
  }
  if (!state.behaviorWithPeople) {
    errors.behaviorWithPeople = i18n.t('dogForm.validation.selectBehaviorPeople');
  }
  if (!state.leashBehavior) {
    errors.leashBehavior = i18n.t('dogForm.validation.selectLeash');
  }
  return errors;
}

function validateStep2(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (state.walkPrefTime.length === 0) {
    errors.walkPrefTime = i18n.t('dogForm.validation.selectSchedule');
  }
  if (state.walkPrefTerrain.length === 0) {
    errors.walkPrefTerrain = i18n.t('dogForm.validation.selectTerrain');
  }
  const dMin = Number(state.walkPrefDurationMin);
  const dMax = Number(state.walkPrefDurationMax);
  if (dMin < 15 || dMin > 180) {
    errors.walkPrefDurationMin = i18n.t('dogForm.validation.durationMinRange');
  }
  if (dMax < 15 || dMax > 180) {
    errors.walkPrefDurationMax = i18n.t('dogForm.validation.durationMaxRange');
  }
  if (dMin > dMax) {
    errors.walkPrefDurationMax = i18n.t('dogForm.validation.durationMaxGteMin');
  }
  return errors;
}

const STEP_VALIDATORS = [validateStep0, validateStep1, validateStep2] as const;

// -- Bio generation --

function canGenerateBioFromState(state: DogFormState): boolean {
  return (
    !!state.name &&
    !!state.breed &&
    state.size !== null &&
    !!state.gender &&
    !!state.energyLevel &&
    !!state.behaviorWithDogs &&
    !!state.behaviorWithPeople &&
    !!state.leashBehavior &&
    state.walkPrefTime.length > 0 &&
    state.walkPrefTerrain.length > 0
  );
}

/** Asserts non-null for fields guaranteed present by step validation. */
function required<T>(val: T | null | undefined): T {
  if (val == null) throw new Error('Required field is missing');
  return val;
}

function buildBioMutationInput(state: DogFormState) {
  return {
    name: state.name,
    breed: state.breed,
    breedSecondary: state.breedSecondary || undefined,
    size: required(state.size),
    gender: required(state.gender),
    energyLevel: required(state.energyLevel),
    behaviorWithDogs: required(state.behaviorWithDogs),
    behaviorWithPeople: required(state.behaviorWithPeople),
    leashBehavior: required(state.leashBehavior),
    walkPrefTime: state.walkPrefTime,
    walkPrefTerrain: state.walkPrefTerrain,
  };
}

// -- Photo analysis --

async function pickPhotoFromLibrary() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(i18n.t('common.permissionRequired'), i18n.t('common.galleryPermissionAnalyze'));
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });

  const asset = result.canceled ? undefined : result.assets?.[0];
  const base64 = asset?.base64;
  if (!(asset && base64)) return null;

  return { base64, mimeType: asset.mimeType ?? 'image/jpeg' };
}

function applyPhotoAnalysis(
  dispatch: React.Dispatch<DogFormAction>,
  analysis: { breed: string; size: string; breedSecondary?: string | null },
) {
  dispatch({ type: 'SET_FIELD', field: 'breed', value: analysis.breed });
  dispatch({ type: 'SET_FIELD', field: 'size', value: analysis.size });
  if (analysis.breedSecondary) {
    dispatch({ type: 'SET_FIELD', field: 'breedSecondary', value: analysis.breedSecondary });
  }
}

// -- Form data builder --

function buildFormData(state: DogFormState) {
  return {
    name: state.name,
    breed: state.breed,
    breedSecondary: state.breedSecondary || undefined,
    birthDate: state.birthDate ? new Date(state.birthDate) : undefined,
    weightKg: state.weightKg ? Number(state.weightKg) : undefined,
    size: state.size,
    gender: state.gender,
    isNeutered: state.isNeutered,
    bio: state.bio || undefined,
    energyLevel: state.energyLevel,
    behaviorWithDogs: state.behaviorWithDogs,
    behaviorWithPeople: state.behaviorWithPeople,
    leashBehavior: state.leashBehavior,
    recallReliability: state.recallReliability || undefined,
    walkPrefTime: state.walkPrefTime,
    walkPrefTerrain: state.walkPrefTerrain,
    walkPrefDurationMin: Number(state.walkPrefDurationMin),
    walkPrefDurationMax: Number(state.walkPrefDurationMax),
  };
}

// -- Hook --

export function useNewDogViewModel() {
  const router = useRouter();
  const addDog = useDogsStore((s) => s.addDog);
  const dogCount = useDogsStore((s) => s.dogs.length);

  const [state, dispatch] = useReducer(formReducer, initialState);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const setField = useCallback(<K extends keyof DogFormState>(field: K, value: DogFormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value: value as DogFormState[keyof DogFormState] });
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const generateBio = useCallback(async () => {
    if (!canGenerateBioFromState(state)) return;

    setGeneratingBio(true);
    try {
      const { bio } = await dogRepo.generateBio(buildBioMutationInput(state));
      dispatch({ type: 'SET_FIELD', field: 'bio', value: bio });
    } catch (e) {
      setApiError(handleApiError(e, 'generateBio').message);
    } finally {
      setGeneratingBio(false);
    }
  }, [state]);

  const canGenerateBio = canGenerateBioFromState(state);

  const MAX_PHOTOS = 6;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const addPendingPhoto = useCallback(async () => {
    if (state.pendingPhotos.length >= MAX_PHOTOS) {
      Alert.alert(
        i18n.t('dogForm.validation.limitReachedTitle'),
        i18n.t('dogForm.validation.maxPhotosReached', { max: MAX_PHOTOS }),
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i18n.t('common.permissionRequired'), i18n.t('common.galleryPermissionUpload'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileSize = asset.fileSize ?? 0;
    if (fileSize > MAX_FILE_SIZE) {
      Alert.alert(i18n.t('common.fileTooLarge'), i18n.t('common.fileTooLargeMessage'));
      return;
    }

    const contentType = asset.mimeType ?? 'image/jpeg';
    dispatch({ type: 'ADD_PENDING_PHOTO', photo: { uri: asset.uri, contentType, fileSize } });
  }, [state.pendingPhotos.length]);

  const removePendingPhoto = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_PENDING_PHOTO', index });
  }, []);

  const analyzePhoto = useCallback(async () => {
    const photo = await pickPhotoFromLibrary();
    if (!photo) return;

    setAnalyzingPhoto(true);
    setApiError('');
    try {
      const { analysis } = await dogRepo.analyzePhoto({
        imageBase64: photo.base64,
        mimeType: photo.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      });
      applyPhotoAnalysis(dispatch, analysis);
    } catch (e) {
      setApiError(handleApiError(e, 'analyzePhoto').message);
    } finally {
      setAnalyzingPhoto(false);
    }
  }, []);

  const validateStep = useCallback((): boolean => {
    setErrors({});
    const validator = STEP_VALIDATORS[step];
    if (validator) {
      const stepErrors = validator(state);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }
    }
    return true;
  }, [step, state]);

  const nextStep = useCallback(() => {
    if (validateStep()) {
      setStep((s) => s + 1);
    }
  }, [validateStep]);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;

    if (dogCount >= MAX_DOGS_PER_USER) {
      setApiError(i18n.t('dogForm.validation.maxDogsReached', { max: MAX_DOGS_PER_USER }));
      return;
    }

    const data = buildFormData(state);
    const result = createDogSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors = zodToFieldErrors(result.error);
      setErrors(fieldErrors);
      setApiError(Object.values(fieldErrors).join('\n'));
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const { dog } = await dogRepo.create(result.data);

      let failedUploads = 0;
      for (const photo of state.pendingPhotos) {
        try {
          const contentType = photo.contentType as MediaContentType;
          const { uploadUrl, key } = await mediaRepo.getDogPhotoUploadUrl(
            dog.id,
            contentType,
            photo.fileSize,
          );
          await uploadToPresignedUrl(uploadUrl, photo.uri, contentType);
          await mediaRepo.confirmDogPhoto(dog.id, key);
        } catch (e) {
          failedUploads++;
          logger.warn('NewDog', `Failed to upload photo: ${photo.uri}`, e);
        }
      }

      addDog(dog);

      if (failedUploads > 0) {
        Alert.alert(
          i18n.t('dogForm.photoUploadPartialTitle'),
          i18n.t('dogForm.photoUploadPartialMessage', { count: failedUploads }),
        );
      }

      router.replace('/(tabs)/profile');
    } catch (e) {
      setApiError(handleApiError(e, 'createDog').message);
    } finally {
      setLoading(false);
    }
  }, [validateStep, dogCount, state, addDog, router]);

  return {
    state,
    setField,
    step,
    nextStep,
    prevStep,
    errors,
    apiError,
    loading,
    handleSubmit,
    generatingBio,
    generateBio,
    canGenerateBio,
    analyzingPhoto,
    analyzePhoto,
    addPendingPhoto,
    removePendingPhoto,
    pendingPhotos: state.pendingPhotos,
  } as const;
}
