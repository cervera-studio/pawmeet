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
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { zodToFieldErrors } from '@/lib/validation';
import { useDogsStore } from '@/stores/dogs';

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

type DogFormAction = {
  type: 'SET_FIELD';
  field: keyof DogFormState;
  value: DogFormState[keyof DogFormState];
};

function formReducer(state: DogFormState, action: DogFormAction): DogFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
}

// -- Validation helpers --

function validateStep0(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.name || state.name.length < 2) {
    errors.name = 'Il nome deve avere almeno 2 caratteri';
  }
  if (!state.breed) errors.breed = 'Inserisci la razza';
  if (!state.birthDate) errors.birthDate = 'Inserisci la data di nascita';
  if (!state.weightKg || Number(state.weightKg) < 0.5) {
    errors.weightKg = 'Inserisci un peso valido (min 0.5 kg)';
  }
  if (state.size === null) errors.size = i18n.t('dogForm.validation.selectSize');
  if (!state.gender) errors.gender = i18n.t('dogForm.validation.selectGender');
  if (state.isNeutered === null) errors.isNeutered = 'Indica se sterilizzato/a';
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
    errors.walkPrefDurationMin = 'Durata minima tra 15 e 180 minuti';
  }
  if (dMax < 15 || dMax > 180) {
    errors.walkPrefDurationMax = 'Durata massima tra 15 e 180 minuti';
  }
  if (dMin > dMax) {
    errors.walkPrefDurationMax = 'La durata massima deve essere >= minima';
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
  return val as T;
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
    Alert.alert('Permesso necessario', "Consenti l'accesso alla galleria per analizzare la foto.");
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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: multi-step dog creation wizard coordinates form state, validation, and API calls
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
  }, []);

  const generateBio = useCallback(async () => {
    if (!canGenerateBioFromState(state)) return;

    setGeneratingBio(true);
    try {
      const { bio } = await api.dogs.generateBio.mutate(buildBioMutationInput(state));
      dispatch({ type: 'SET_FIELD', field: 'bio', value: bio });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('dogForm.bioGenerationError'));
    } finally {
      setGeneratingBio(false);
    }
  }, [state]);

  const canGenerateBio = canGenerateBioFromState(state);

  const MAX_PHOTOS = 6;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const addPendingPhoto = useCallback(async () => {
    if (state.pendingPhotos.length >= MAX_PHOTOS) {
      Alert.alert('Limite raggiunto', `Puoi aggiungere al massimo ${MAX_PHOTOS} foto.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', "Consenti l'accesso alla galleria per caricare foto.");
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
      Alert.alert('File troppo grande', 'La foto non può superare i 5 MB.');
      return;
    }

    const contentType = asset.mimeType ?? 'image/jpeg';
    const photo: PendingPhoto = { uri: asset.uri, contentType, fileSize };
    dispatch({
      type: 'SET_FIELD',
      field: 'pendingPhotos',
      value: [...state.pendingPhotos, photo],
    });
  }, [state.pendingPhotos]);

  const removePendingPhoto = useCallback(
    (index: number) => {
      dispatch({
        type: 'SET_FIELD',
        field: 'pendingPhotos',
        value: state.pendingPhotos.filter((_, i) => i !== index),
      });
    },
    [state.pendingPhotos],
  );

  const analyzePhoto = useCallback(async () => {
    const photo = await pickPhotoFromLibrary();
    if (!photo) return;

    setAnalyzingPhoto(true);
    setApiError('');
    try {
      const { analysis } = await api.dogs.analyzePhoto.mutate({
        imageBase64: photo.base64,
        mimeType: photo.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      });
      applyPhotoAnalysis(dispatch, analysis);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Errore durante l'analisi della foto");
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
      setApiError(`Puoi aggiungere al massimo ${MAX_DOGS_PER_USER} cani`);
      return;
    }

    const data = buildFormData(state);
    const result = createDogSchema.safeParse(data);
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const { dog } = await api.dogs.create.mutate(result.data);

      // Upload pending photos after dog creation
      for (const photo of state.pendingPhotos) {
        try {
          const { uploadUrl, key } = await api.dogs.uploadPhotoUrl.mutate({
            dogId: dog.id,
            contentType: photo.contentType,
            fileSize: photo.fileSize,
          });

          const response = await fetch(photo.uri);
          const blob = await response.blob();
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': photo.contentType },
            body: blob,
          });

          await api.dogs.confirmPhoto.mutate({ dogId: dog.id, key });
        } catch (e) {
          logger.warn('NewDog', `Failed to upload photo: ${photo.uri}`, e);
        }
      }

      addDog(dog);
      router.back();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : i18n.t('dogForm.createError'));
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
