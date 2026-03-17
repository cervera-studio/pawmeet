import { MAX_DOGS_PER_USER } from '@pawmeet/config';
import { createDogSchema } from '@pawmeet/validation';
import { useRouter } from 'expo-router';
import { useCallback, useReducer, useState } from 'react';
import { api } from '@/lib/trpc';
import { zodToFieldErrors } from '@/lib/validation';
import { useDogsStore } from '@/stores/dogs';

// -- State shape --

interface DogFormState {
  // Step 1: Basic info
  name: string;
  breed: string;
  breedSecondary: string;
  birthDate: string;
  weightKg: string;
  size: string | null;
  gender: string | null;
  isNeutered: boolean | null;
  bio: string;

  // Step 2: Temperament
  energyLevel: string | null;
  behaviorWithDogs: string | null;
  behaviorWithPeople: string | null;
  leashBehavior: string | null;
  recallReliability: string | null;

  // Step 3: Walk preferences
  walkPrefTime: string[];
  walkPrefTerrain: string[];
  walkPrefDurationMin: string;
  walkPrefDurationMax: string;
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
  if (!state.size) errors.size = 'Seleziona la taglia';
  if (!state.gender) errors.gender = 'Seleziona il sesso';
  if (state.isNeutered === null) errors.isNeutered = 'Indica se sterilizzato/a';
  return errors;
}

function validateStep1(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.energyLevel) errors.energyLevel = 'Seleziona il livello di energia';
  if (!state.behaviorWithDogs) {
    errors.behaviorWithDogs = 'Seleziona il comportamento con altri cani';
  }
  if (!state.behaviorWithPeople) {
    errors.behaviorWithPeople = 'Seleziona il comportamento con le persone';
  }
  if (!state.leashBehavior) {
    errors.leashBehavior = 'Seleziona il comportamento al guinzaglio';
  }
  return errors;
}

function validateStep2(state: DogFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (state.walkPrefTime.length === 0) {
    errors.walkPrefTime = 'Seleziona almeno un orario preferito';
  }
  if (state.walkPrefTerrain.length === 0) {
    errors.walkPrefTerrain = 'Seleziona almeno un tipo di terreno';
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

  const setField = useCallback(<K extends keyof DogFormState>(field: K, value: DogFormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value: value as DogFormState[keyof DogFormState] });
  }, []);

  const generateBio = useCallback(async () => {
    if (
      !state.name ||
      !state.breed ||
      !state.size ||
      !state.gender ||
      !state.energyLevel ||
      !state.behaviorWithDogs ||
      !state.behaviorWithPeople ||
      !state.leashBehavior ||
      state.walkPrefTime.length === 0 ||
      state.walkPrefTerrain.length === 0
    ) {
      return;
    }

    setGeneratingBio(true);
    try {
      const { bio } = await api.dogs.generateBio.mutate({
        name: state.name,
        breed: state.breed,
        breedSecondary: state.breedSecondary || undefined,
        size: state.size as 'toy' | 'piccola' | 'media' | 'grande' | 'gigante',
        gender: state.gender as 'maschio' | 'femmina',
        energyLevel: state.energyLevel as 'bassa' | 'media' | 'alta' | 'molto_alta',
        behaviorWithDogs: state.behaviorWithDogs as
          | 'molto_socievole'
          | 'socievole'
          | 'selettivo'
          | 'reattivo',
        behaviorWithPeople: state.behaviorWithPeople as
          | 'molto_socievole'
          | 'socievole'
          | 'timido'
          | 'diffidente',
        leashBehavior: state.leashBehavior as
          | 'eccellente'
          | 'buono'
          | 'in_addestramento'
          | 'difficile',
        walkPrefTime: state.walkPrefTime as (
          | 'mattina_presto'
          | 'mattina'
          | 'pomeriggio'
          | 'sera'
          | 'sera_tardi'
        )[],
        walkPrefTerrain: state.walkPrefTerrain as (
          | 'urbano'
          | 'parco'
          | 'campagna'
          | 'spiaggia'
          | 'montagna'
        )[],
      });
      dispatch({ type: 'SET_FIELD', field: 'bio', value: bio });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Errore durante la generazione della bio');
    } finally {
      setGeneratingBio(false);
    }
  }, [state]);

  const canGenerateBio =
    !!state.name &&
    !!state.breed &&
    !!state.size &&
    !!state.gender &&
    !!state.energyLevel &&
    !!state.behaviorWithDogs &&
    !!state.behaviorWithPeople &&
    !!state.leashBehavior &&
    state.walkPrefTime.length > 0 &&
    state.walkPrefTerrain.length > 0;

  const buildFormData = useCallback(
    () => ({
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
    }),
    [state],
  );

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

    const data = buildFormData();
    const result = createDogSchema.safeParse(data);
    if (!result.success) {
      setErrors(zodToFieldErrors(result.error));
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      const { dog } = await api.dogs.create.mutate(result.data);
      addDog(dog);
      router.back();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  }, [validateStep, dogCount, buildFormData, addDog, router]);

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
  } as const;
}
