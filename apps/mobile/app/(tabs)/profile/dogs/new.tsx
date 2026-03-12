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
import { Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelect } from '@/components/ChipSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNewDogViewModel } from './new.view-model';

const STEPS = ['Info base', 'Temperamento', 'Passeggiate', 'Foto'];

// -- Step sub-components --

function StepIndicator({ step }: { step: number }) {
  return (
    <View className="mb-8 flex-row gap-2">
      {STEPS.map((s, i) => (
        <View key={s} className="flex-1 items-center">
          <View
            className={`mb-1 h-1 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-200'}`}
          />
          <Text className={`text-xs ${i <= step ? 'text-primary' : 'text-gray-400'}`}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="mt-1 px-1 text-sm text-red-500">{message}</Text>;
}

function Step1BasicInfo({
  state,
  setField,
  errors,
}: {
  state: ReturnType<typeof useNewDogViewModel>['state'];
  setField: ReturnType<typeof useNewDogViewModel>['setField'];
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-gray-900">Come si chiama il tuo cane?</Text>

      <View>
        <Input placeholder="Nome" value={state.name} onChangeText={(v) => setField('name', v)} />
        <FieldError message={errors.name} />
      </View>

      <View>
        <Input placeholder="Razza" value={state.breed} onChangeText={(v) => setField('breed', v)} />
        <FieldError message={errors.breed} />
      </View>

      <Input
        placeholder="Seconda razza (opzionale)"
        value={state.breedSecondary}
        onChangeText={(v) => setField('breedSecondary', v)}
      />

      <View>
        <Input
          placeholder="Data di nascita (AAAA-MM-GG)"
          value={state.birthDate}
          onChangeText={(v) => setField('birthDate', v)}
        />
        <FieldError message={errors.birthDate} />
      </View>

      <View>
        <Input
          placeholder="Peso (kg)"
          value={state.weightKg}
          onChangeText={(v) => setField('weightKg', v)}
          keyboardType="decimal-pad"
        />
        <FieldError message={errors.weightKg} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Taglia</Text>
        <ChipSelect
          options={SIZE_OPTIONS}
          selected={state.size ?? ('' as string)}
          onSelect={(v) => setField('size', v)}
        />
        <FieldError message={errors.size} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Sesso</Text>
        <ChipSelect
          options={GENDER_OPTIONS}
          selected={state.gender ?? ('' as string)}
          onSelect={(v) => setField('gender', v)}
        />
        <FieldError message={errors.gender} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Sterilizzato/a?</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setField('isNeutered', true)}
            className={`rounded-full px-4 py-2 ${
              state.isNeutered === true ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                state.isNeutered === true ? 'text-white' : 'text-gray-700'
              }`}
            >
              Si
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setField('isNeutered', false)}
            className={`rounded-full px-4 py-2 ${
              state.isNeutered === false ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                state.isNeutered === false ? 'text-white' : 'text-gray-700'
              }`}
            >
              No
            </Text>
          </Pressable>
        </View>
        <FieldError message={errors.isNeutered} />
      </View>

      <Input
        placeholder="Bio (opzionale, max 500 caratteri)"
        value={state.bio}
        onChangeText={(v) => setField('bio', v)}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

function Step2Personality({
  state,
  setField,
  errors,
}: {
  state: ReturnType<typeof useNewDogViewModel>['state'];
  setField: ReturnType<typeof useNewDogViewModel>['setField'];
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-5">
      <Text className="text-xl font-bold text-gray-900">Parlaci del suo carattere</Text>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Livello di energia</Text>
        <ChipSelect
          options={ENERGY_OPTIONS}
          selected={state.energyLevel ?? ('' as string)}
          onSelect={(v) => setField('energyLevel', v)}
        />
        <FieldError message={errors.energyLevel} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Comportamento con altri cani</Text>
        <ChipSelect
          options={BEHAVIOR_DOGS_OPTIONS}
          selected={state.behaviorWithDogs ?? ('' as string)}
          onSelect={(v) => setField('behaviorWithDogs', v)}
        />
        <FieldError message={errors.behaviorWithDogs} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Comportamento con le persone</Text>
        <ChipSelect
          options={BEHAVIOR_PEOPLE_OPTIONS}
          selected={state.behaviorWithPeople ?? ('' as string)}
          onSelect={(v) => setField('behaviorWithPeople', v)}
        />
        <FieldError message={errors.behaviorWithPeople} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Comportamento al guinzaglio</Text>
        <ChipSelect
          options={LEASH_OPTIONS}
          selected={state.leashBehavior ?? ('' as string)}
          onSelect={(v) => setField('leashBehavior', v)}
        />
        <FieldError message={errors.leashBehavior} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Richiamo (opzionale)</Text>
        <ChipSelect
          options={RECALL_OPTIONS}
          selected={state.recallReliability ?? ('' as string)}
          onSelect={(v) => setField('recallReliability', v)}
        />
      </View>
    </View>
  );
}

function Step3WalkPrefs({
  state,
  setField,
  errors,
}: {
  state: ReturnType<typeof useNewDogViewModel>['state'];
  setField: ReturnType<typeof useNewDogViewModel>['setField'];
  errors: Record<string, string>;
}) {
  return (
    <View className="gap-5">
      <Text className="text-xl font-bold text-gray-900">Preferenze passeggiata</Text>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Orari preferiti</Text>
        <ChipSelect
          options={WALK_TIME_OPTIONS}
          selected={state.walkPrefTime}
          onSelect={(v) => setField('walkPrefTime', v)}
          multiple
        />
        <FieldError message={errors.walkPrefTime} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Tipo di terreno</Text>
        <ChipSelect
          options={TERRAIN_OPTIONS}
          selected={state.walkPrefTerrain}
          onSelect={(v) => setField('walkPrefTerrain', v)}
          multiple
        />
        <FieldError message={errors.walkPrefTerrain} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Durata minima (minuti)</Text>
        <Input
          placeholder="30"
          value={state.walkPrefDurationMin}
          onChangeText={(v) => setField('walkPrefDurationMin', v)}
          keyboardType="number-pad"
        />
        <FieldError message={errors.walkPrefDurationMin} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700">Durata massima (minuti)</Text>
        <Input
          placeholder="60"
          value={state.walkPrefDurationMax}
          onChangeText={(v) => setField('walkPrefDurationMax', v)}
          keyboardType="number-pad"
        />
        <FieldError message={errors.walkPrefDurationMax} />
      </View>
    </View>
  );
}

function Step4Photos() {
  return (
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
  );
}

// -- Main screen --

export default function NewDogScreen() {
  const { state, setField, step, nextStep, prevStep, errors, apiError, loading, handleSubmit } =
    useNewDogViewModel();

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
          <StepIndicator step={step} />

          {apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{apiError}</Text>
            </View>
          ) : null}

          {step === 0 && <Step1BasicInfo state={state} setField={setField} errors={errors} />}
          {step === 1 && <Step2Personality state={state} setField={setField} errors={errors} />}
          {step === 2 && <Step3WalkPrefs state={state} setField={setField} errors={errors} />}
          {step === 3 && <Step4Photos />}

          {/* Navigation */}
          <View className="mt-8 gap-3">
            {step < STEPS.length - 1 ? (
              <Button onPress={nextStep} label="Avanti" />
            ) : (
              <Button
                onPress={handleSubmit}
                label={loading ? 'Creazione...' : 'Crea profilo'}
                disabled={loading}
              />
            )}
            {step > 0 && <Button onPress={prevStep} label="Indietro" variant="outline" />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
