import { createDogSchema } from '@dogwalk/validation';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

// Label maps for Italian UI
const SIZE_OPTIONS = [
  { value: 'toy', label: 'Toy' },
  { value: 'piccola', label: 'Piccola' },
  { value: 'media', label: 'Media' },
  { value: 'grande', label: 'Grande' },
  { value: 'gigante', label: 'Gigante' },
] as const;

const ENERGY_OPTIONS = [
  { value: 'bassa', label: 'Bassa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'molto_alta', label: 'Molto alta' },
] as const;

const GENDER_OPTIONS = [
  { value: 'maschio', label: 'Maschio' },
  { value: 'femmina', label: 'Femmina' },
] as const;

const BEHAVIOR_DOGS_OPTIONS = [
  { value: 'molto_socievole', label: 'Molto socievole' },
  { value: 'socievole', label: 'Socievole' },
  { value: 'selettivo', label: 'Selettivo' },
  { value: 'reattivo', label: 'Reattivo' },
] as const;

const BEHAVIOR_PEOPLE_OPTIONS = [
  { value: 'molto_socievole', label: 'Molto socievole' },
  { value: 'socievole', label: 'Socievole' },
  { value: 'timido', label: 'Timido' },
  { value: 'diffidente', label: 'Diffidente' },
] as const;

const LEASH_OPTIONS = [
  { value: 'eccellente', label: 'Eccellente' },
  { value: 'buono', label: 'Buono' },
  { value: 'in_addestramento', label: 'In addestramento' },
  { value: 'difficile', label: 'Difficile' },
] as const;

const RECALL_OPTIONS = [
  { value: 'affidabile', label: 'Affidabile' },
  { value: 'parziale', label: 'Parziale' },
  { value: 'non_affidabile', label: 'Non affidabile' },
] as const;

const WALK_TIME_OPTIONS = [
  { value: 'mattina_presto', label: 'Mattina presto' },
  { value: 'mattina', label: 'Mattina' },
  { value: 'pomeriggio', label: 'Pomeriggio' },
  { value: 'sera', label: 'Sera' },
  { value: 'sera_tardi', label: 'Sera tardi' },
] as const;

const TERRAIN_OPTIONS = [
  { value: 'urbano', label: 'Urbano' },
  { value: 'parco', label: 'Parco' },
  { value: 'campagna', label: 'Campagna' },
  { value: 'spiaggia', label: 'Spiaggia' },
  { value: 'montagna', label: 'Montagna' },
] as const;

function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 ${value === opt.value ? 'bg-primary' : 'bg-gray-100'}`}
        >
          <Text
            className={`text-sm font-medium ${
              value === opt.value ? 'text-white' : 'text-gray-700'
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MultiChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (item: T) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => toggle(opt.value)}
          className={`rounded-full px-4 py-2 ${
            value.includes(opt.value) ? 'bg-primary' : 'bg-gray-100'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              value.includes(opt.value) ? 'text-white' : 'text-gray-700'
            }`}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const STEPS = ['Info base', 'Temperamento', 'Passeggiate', 'Foto'];

export default function NewDogScreen() {
  const router = useRouter();
  const addDog = useDogsStore((s) => s.addDog);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Basic info
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [breedSecondary, setBreedSecondary] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [size, setSize] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [isNeutered, setIsNeutered] = useState<boolean | null>(null);
  const [bio, setBio] = useState('');

  // Step 2: Temperament
  const [energyLevel, setEnergyLevel] = useState<string | null>(null);
  const [behaviorWithDogs, setBehaviorWithDogs] = useState<string | null>(null);
  const [behaviorWithPeople, setBehaviorWithPeople] = useState<string | null>(null);
  const [leashBehavior, setLeashBehavior] = useState<string | null>(null);
  const [recallReliability, setRecallReliability] = useState<string | null>(null);

  // Step 3: Walk preferences
  const [walkPrefTime, setWalkPrefTime] = useState<string[]>([]);
  const [walkPrefTerrain, setWalkPrefTerrain] = useState<string[]>([]);
  const [walkPrefDurationMin, setWalkPrefDurationMin] = useState('30');
  const [walkPrefDurationMax, setWalkPrefDurationMax] = useState('60');

  const buildFormData = () => ({
    name,
    breed,
    breedSecondary: breedSecondary || undefined,
    birthDate: birthDate ? new Date(birthDate) : undefined,
    weightKg: weightKg ? Number(weightKg) : undefined,
    size,
    gender,
    isNeutered,
    bio: bio || undefined,
    energyLevel,
    behaviorWithDogs,
    behaviorWithPeople,
    leashBehavior,
    recallReliability: recallReliability || undefined,
    walkPrefTime,
    walkPrefTerrain,
    walkPrefDurationMin: Number(walkPrefDurationMin),
    walkPrefDurationMax: Number(walkPrefDurationMax),
  });

  const validateStep = (): boolean => {
    setErrors({});
    const data = buildFormData();

    if (step === 0) {
      const stepErrors: Record<string, string> = {};
      if (!name || name.length < 2) stepErrors.name = 'Il nome deve avere almeno 2 caratteri';
      if (!breed) stepErrors.breed = 'Inserisci la razza';
      if (!birthDate) stepErrors.birthDate = 'Inserisci la data di nascita';
      if (!weightKg || Number(weightKg) < 0.5)
        stepErrors.weightKg = 'Inserisci un peso valido (min 0.5 kg)';
      if (!size) stepErrors.size = 'Seleziona la taglia';
      if (!gender) stepErrors.gender = 'Seleziona il sesso';
      if (isNeutered === null) stepErrors.isNeutered = 'Indica se sterilizzato/a';
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }
    }

    if (step === 1) {
      const stepErrors: Record<string, string> = {};
      if (!energyLevel) stepErrors.energyLevel = 'Seleziona il livello di energia';
      if (!behaviorWithDogs)
        stepErrors.behaviorWithDogs = 'Seleziona il comportamento con altri cani';
      if (!behaviorWithPeople)
        stepErrors.behaviorWithPeople = 'Seleziona il comportamento con le persone';
      if (!leashBehavior) stepErrors.leashBehavior = 'Seleziona il comportamento al guinzaglio';
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }
    }

    if (step === 2) {
      const stepErrors: Record<string, string> = {};
      if (walkPrefTime.length === 0)
        stepErrors.walkPrefTime = 'Seleziona almeno un orario preferito';
      if (walkPrefTerrain.length === 0)
        stepErrors.walkPrefTerrain = 'Seleziona almeno un tipo di terreno';
      const dMin = Number(walkPrefDurationMin);
      const dMax = Number(walkPrefDurationMax);
      if (dMin < 15 || dMin > 180)
        stepErrors.walkPrefDurationMin = 'Durata minima tra 15 e 180 minuti';
      if (dMax < 15 || dMax > 180)
        stepErrors.walkPrefDurationMax = 'Durata massima tra 15 e 180 minuti';
      if (dMin > dMax) stepErrors.walkPrefDurationMax = 'La durata massima deve essere >= minima';
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleCreate = async () => {
    if (!validateStep()) return;

    const data = buildFormData();
    const result = createDogSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
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
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nuovo cane',
          headerBackTitle: 'Profilo',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <ScrollView contentContainerClassName="px-6 py-4" keyboardShouldPersistTaps="handled">
          {/* Step indicator */}
          <View className="mb-8 flex-row gap-2">
            {STEPS.map((s, i) => (
              <View key={s} className="flex-1 items-center">
                <View
                  className={`mb-1 h-1 w-full rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
                <Text className={`text-xs ${i <= step ? 'text-primary' : 'text-gray-400'}`}>
                  {s}
                </Text>
              </View>
            ))}
          </View>

          {apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{apiError}</Text>
            </View>
          ) : null}

          {/* Step 1: Basic info */}
          {step === 0 && (
            <View className="gap-4">
              <Text className="text-xl font-bold text-gray-900">Come si chiama il tuo cane?</Text>

              <View>
                <Input placeholder="Nome" value={name} onChangeText={setName} />
                {errors.name ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.name}</Text>
                ) : null}
              </View>

              <View>
                <Input placeholder="Razza" value={breed} onChangeText={setBreed} />
                {errors.breed ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.breed}</Text>
                ) : null}
              </View>

              <Input
                placeholder="Seconda razza (opzionale)"
                value={breedSecondary}
                onChangeText={setBreedSecondary}
              />

              <View>
                <Input
                  placeholder="Data di nascita (AAAA-MM-GG)"
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
                {errors.birthDate ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.birthDate}</Text>
                ) : null}
              </View>

              <View>
                <Input
                  placeholder="Peso (kg)"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                />
                {errors.weightKg ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.weightKg}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Taglia</Text>
                <ChipSelect options={SIZE_OPTIONS} value={size} onChange={setSize} />
                {errors.size ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.size}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Sesso</Text>
                <ChipSelect options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                {errors.gender ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.gender}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Sterilizzato/a?</Text>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setIsNeutered(true)}
                    className={`rounded-full px-4 py-2 ${
                      isNeutered === true ? 'bg-primary' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isNeutered === true ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      Si
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsNeutered(false)}
                    className={`rounded-full px-4 py-2 ${
                      isNeutered === false ? 'bg-primary' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        isNeutered === false ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>
                {errors.isNeutered ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.isNeutered}</Text>
                ) : null}
              </View>

              <Input
                placeholder="Bio (opzionale, max 500 caratteri)"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* Step 2: Temperament */}
          {step === 1 && (
            <View className="gap-5">
              <Text className="text-xl font-bold text-gray-900">Parlaci del suo carattere</Text>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Livello di energia</Text>
                <ChipSelect
                  options={ENERGY_OPTIONS}
                  value={energyLevel}
                  onChange={setEnergyLevel}
                />
                {errors.energyLevel ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.energyLevel}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Comportamento con altri cani
                </Text>
                <ChipSelect
                  options={BEHAVIOR_DOGS_OPTIONS}
                  value={behaviorWithDogs}
                  onChange={setBehaviorWithDogs}
                />
                {errors.behaviorWithDogs ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.behaviorWithDogs}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Comportamento con le persone
                </Text>
                <ChipSelect
                  options={BEHAVIOR_PEOPLE_OPTIONS}
                  value={behaviorWithPeople}
                  onChange={setBehaviorWithPeople}
                />
                {errors.behaviorWithPeople ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">
                    {errors.behaviorWithPeople}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Comportamento al guinzaglio
                </Text>
                <ChipSelect
                  options={LEASH_OPTIONS}
                  value={leashBehavior}
                  onChange={setLeashBehavior}
                />
                {errors.leashBehavior ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.leashBehavior}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Richiamo (opzionale)</Text>
                <ChipSelect
                  options={RECALL_OPTIONS}
                  value={recallReliability}
                  onChange={setRecallReliability}
                />
              </View>
            </View>
          )}

          {/* Step 3: Walk preferences */}
          {step === 2 && (
            <View className="gap-5">
              <Text className="text-xl font-bold text-gray-900">Preferenze passeggiata</Text>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Orari preferiti</Text>
                <MultiChipSelect
                  options={WALK_TIME_OPTIONS}
                  value={walkPrefTime}
                  onChange={setWalkPrefTime}
                />
                {errors.walkPrefTime ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.walkPrefTime}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">Tipo di terreno</Text>
                <MultiChipSelect
                  options={TERRAIN_OPTIONS}
                  value={walkPrefTerrain}
                  onChange={setWalkPrefTerrain}
                />
                {errors.walkPrefTerrain ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">{errors.walkPrefTerrain}</Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Durata minima (minuti)
                </Text>
                <Input
                  placeholder="30"
                  value={walkPrefDurationMin}
                  onChangeText={setWalkPrefDurationMin}
                  keyboardType="number-pad"
                />
                {errors.walkPrefDurationMin ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">
                    {errors.walkPrefDurationMin}
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700">
                  Durata massima (minuti)
                </Text>
                <Input
                  placeholder="60"
                  value={walkPrefDurationMax}
                  onChangeText={setWalkPrefDurationMax}
                  keyboardType="number-pad"
                />
                {errors.walkPrefDurationMax ? (
                  <Text className="mt-1 px-1 text-sm text-red-500">
                    {errors.walkPrefDurationMax}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Step 4: Photos */}
          {step === 3 && (
            <View className="gap-4">
              <Text className="text-xl font-bold text-gray-900">Aggiungi delle foto</Text>
              <Text className="text-sm text-gray-500">
                Potrai aggiungere foto dopo aver creato il profilo.
              </Text>
              <View className="h-48 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200">
                <Text className="text-4xl">📷</Text>
                <Text className="mt-2 text-sm text-gray-400">
                  Le foto saranno disponibili dopo la creazione
                </Text>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View className="mt-8 gap-3">
            {step < STEPS.length - 1 ? (
              <Button onPress={handleNext} label="Avanti" />
            ) : (
              <Button
                onPress={handleCreate}
                label={loading ? 'Creazione...' : 'Crea profilo'}
                disabled={loading}
              />
            )}
            {step > 0 && (
              <Button onPress={() => setStep(step - 1)} label="Indietro" variant="outline" />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
