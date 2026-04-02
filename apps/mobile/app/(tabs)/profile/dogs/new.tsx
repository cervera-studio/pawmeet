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
  WalkTerrain,
  WalkTime,
} from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelect } from '@/components/ChipSelect';
import { DatePickerField } from '@/components/DatePickerField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNewDogViewModel } from './_vm/new.view-model';

// -- Step sub-components --

function StepIndicator({ step }: { step: number }) {
  const { t } = useTranslation();
  const STEPS = [
    t('dogForm.sections.basicInfo'),
    t('dogForm.sections.temperament'),
    t('dogForm.sections.walks'),
    t('dogForm.sections.photos'),
  ];

  return (
    <View className="mb-8 flex-row gap-2">
      {STEPS.map((s, i) => (
        <View key={s} className="flex-1 items-center">
          <View
            className={`mb-1 h-1 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-[#48484A]'}`}
          />
          <Text
            className={`text-xs ${i <= step ? 'text-primary' : 'text-gray-400 dark:text-neutral-500'}`}
          >
            {s}
          </Text>
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
  generatingBio,
  canGenerateBio,
  onGenerateBio,
  analyzingPhoto,
  onAnalyzePhoto,
}: {
  state: ReturnType<typeof useNewDogViewModel>['state'];
  setField: ReturnType<typeof useNewDogViewModel>['setField'];
  errors: Record<string, string>;
  generatingBio: boolean;
  canGenerateBio: boolean;
  onGenerateBio: () => void;
  analyzingPhoto: boolean;
  onAnalyzePhoto: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('dogForm.step1Title')}
      </Text>

      {/* Photo analysis CTA */}
      <Pressable
        onPress={onAnalyzePhoto}
        disabled={analyzingPhoto}
        className={`flex-row items-center justify-center rounded-2xl border-2 border-dashed py-4 ${
          analyzingPhoto ? 'border-gray-200 dark:border-[#48484A]' : 'border-primary/40'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            analyzingPhoto ? 'text-gray-400 dark:text-neutral-500' : 'text-primary'
          }`}
        >
          {analyzingPhoto ? t('dogForm.analyzingPhoto') : t('dogForm.analyzePhoto')}
        </Text>
      </Pressable>

      <View>
        <Input
          placeholder={t('dogForm.fields.name')}
          value={state.name}
          onChangeText={(v) => setField('name', v)}
        />
        <FieldError message={errors.name} />
      </View>

      <View>
        <Input
          placeholder={t('dogForm.fields.breed')}
          value={state.breed}
          onChangeText={(v) => setField('breed', v)}
        />
        <FieldError message={errors.breed} />
      </View>

      <Input
        placeholder={t('dogForm.fields.breedSecondary')}
        value={state.breedSecondary}
        onChangeText={(v) => setField('breedSecondary', v)}
      />

      <DatePickerField
        value={state.birthDate ? new Date(state.birthDate) : null}
        onChange={(date) => setField('birthDate', date.toISOString().split('T')[0] ?? '')}
        placeholder={t('dogForm.fields.birthDate')}
        error={errors.birthDate}
        spacingClassName="mb-4"
      />

      <View>
        <Input
          placeholder={t('dogForm.fields.weightKg')}
          value={state.weightKg}
          onChangeText={(v) => setField('weightKg', v)}
          keyboardType="decimal-pad"
        />
        <FieldError message={errors.weightKg} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.size')}
        </Text>
        <ChipSelect
          options={SIZE_OPTIONS}
          selected={state.size ?? ''}
          onSelect={(v) => setField('size', (v || null) as DogSize | null)}
        />
        <FieldError message={errors.size} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.gender')}
        </Text>
        <ChipSelect
          options={GENDER_OPTIONS}
          selected={state.gender ?? ''}
          onSelect={(v) => setField('gender', (v || null) as Gender | null)}
        />
        <FieldError message={errors.gender} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.neutered')}
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setField('isNeutered', true)}
            className={`rounded-full px-4 py-2 ${
              state.isNeutered === true ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                state.isNeutered === true ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
              }`}
            >
              {t('common.yes')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setField('isNeutered', false)}
            className={`rounded-full px-4 py-2 ${
              state.isNeutered === false ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                state.isNeutered === false ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
              }`}
            >
              {t('common.no')}
            </Text>
          </Pressable>
        </View>
        <FieldError message={errors.isNeutered} />
      </View>

      <View>
        <Input
          placeholder={t('dogForm.fields.bio')}
          value={state.bio}
          onChangeText={(v) => setField('bio', v)}
          multiline
          numberOfLines={3}
        />
        <Pressable
          onPress={onGenerateBio}
          disabled={generatingBio || !canGenerateBio}
          className={`mt-2 flex-row items-center justify-center rounded-full border px-4 py-2 ${
            generatingBio || !canGenerateBio
              ? 'border-gray-200 dark:border-[#48484A]'
              : 'border-primary'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              generatingBio || !canGenerateBio
                ? 'text-gray-400 dark:text-neutral-500'
                : 'text-primary'
            }`}
          >
            {generatingBio ? t('dogForm.generatingBio') : t('dogForm.generateBio')}
          </Text>
        </Pressable>
        {!canGenerateBio && (
          <Text className="mt-1 px-1 text-xs text-gray-400 dark:text-neutral-500">
            {t('dogForm.generateBioHint')}
          </Text>
        )}
      </View>
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
  const { t } = useTranslation();
  return (
    <View className="gap-5">
      <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('dogForm.step2Title')}
      </Text>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.energy')}
        </Text>
        <ChipSelect
          options={ENERGY_OPTIONS}
          selected={state.energyLevel ?? ''}
          onSelect={(v) => setField('energyLevel', (v || null) as EnergyLevel | null)}
        />
        <FieldError message={errors.energyLevel} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.behaviorDogs')}
        </Text>
        <ChipSelect
          options={BEHAVIOR_DOGS_OPTIONS}
          selected={state.behaviorWithDogs ?? ''}
          onSelect={(v) => setField('behaviorWithDogs', (v || null) as BehaviorWithDogs | null)}
        />
        <FieldError message={errors.behaviorWithDogs} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.behaviorPeople')}
        </Text>
        <ChipSelect
          options={BEHAVIOR_PEOPLE_OPTIONS}
          selected={state.behaviorWithPeople ?? ''}
          onSelect={(v) => setField('behaviorWithPeople', (v || null) as BehaviorWithPeople | null)}
        />
        <FieldError message={errors.behaviorWithPeople} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.leash')}
        </Text>
        <ChipSelect
          options={LEASH_OPTIONS}
          selected={state.leashBehavior ?? ''}
          onSelect={(v) => setField('leashBehavior', (v || null) as LeashBehavior | null)}
        />
        <FieldError message={errors.leashBehavior} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.recall')}
        </Text>
        <ChipSelect
          options={RECALL_OPTIONS}
          selected={state.recallReliability ?? ''}
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
  const { t } = useTranslation();
  return (
    <View className="gap-5">
      <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('dogForm.step3Title')}
      </Text>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.walkTimes')}
        </Text>
        <ChipSelect
          options={WALK_TIME_OPTIONS}
          selected={state.walkPrefTime}
          onSelect={(v) => setField('walkPrefTime', v as WalkTime[])}
          multiple
        />
        <FieldError message={errors.walkPrefTime} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.walkTerrain')}
        </Text>
        <ChipSelect
          options={TERRAIN_OPTIONS}
          selected={state.walkPrefTerrain}
          onSelect={(v) => setField('walkPrefTerrain', v as WalkTerrain[])}
          multiple
        />
        <FieldError message={errors.walkPrefTerrain} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.durationMin')}
        </Text>
        <Input
          placeholder="30"
          value={state.walkPrefDurationMin}
          onChangeText={(v) => setField('walkPrefDurationMin', v)}
          keyboardType="number-pad"
        />
        <FieldError message={errors.walkPrefDurationMin} />
      </View>

      <View>
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('dogForm.fields.durationMax')}
        </Text>
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

function Step4Photos({
  photos,
  onAdd,
  onRemove,
}: {
  photos: { uri: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('dogForm.addPhotos')}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-neutral-500">{t('dogForm.photosHint')}</Text>

      <View className="flex-row flex-wrap gap-3">
        {photos.map((photo, index) => (
          <View key={photo.uri} className="relative">
            <Image
              source={{ uri: photo.uri }}
              className="h-28 w-28 rounded-xl"
              resizeMode="cover"
            />
            {index === 0 && (
              <View className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-white">
                  {t('dogForm.photosPrimary')}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => onRemove(index)}
              className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500"
            >
              <Text className="text-xs font-bold text-white">✕</Text>
            </Pressable>
          </View>
        ))}

        {photos.length < 6 && (
          <Pressable
            onPress={onAdd}
            className="h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-[#38383A]"
          >
            <Text className="text-3xl text-gray-300 dark:text-neutral-500">+</Text>
            <Text className="text-[10px] text-gray-400 dark:text-neutral-500">
              {t('dogForm.photosAdd')}
            </Text>
          </Pressable>
        )}
      </View>

      {photos.length === 0 && (
        <Text className="text-xs text-gray-400 dark:text-neutral-500">
          {t('dogForm.photosPostCreate')}
        </Text>
      )}
    </View>
  );
}

// -- Main screen --

export default function NewDogScreen() {
  const { t } = useTranslation();
  const {
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
    pendingPhotos,
  } = useNewDogViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('dogForm.newTitle'),
          headerBackTitle: t('profile.dogDetail.backButton'),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <ScrollView contentContainerClassName="px-6 py-4" keyboardShouldPersistTaps="handled">
          <StepIndicator step={step} />

          {apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600 dark:text-red-400">{apiError}</Text>
            </View>
          ) : null}

          {step === 0 && (
            <Step1BasicInfo
              state={state}
              setField={setField}
              errors={errors}
              generatingBio={generatingBio}
              canGenerateBio={canGenerateBio}
              onGenerateBio={generateBio}
              analyzingPhoto={analyzingPhoto}
              onAnalyzePhoto={analyzePhoto}
            />
          )}
          {step === 1 && <Step2Personality state={state} setField={setField} errors={errors} />}
          {step === 2 && <Step3WalkPrefs state={state} setField={setField} errors={errors} />}
          {step === 3 && (
            <Step4Photos
              photos={pendingPhotos}
              onAdd={addPendingPhoto}
              onRemove={removePendingPhoto}
            />
          )}

          {/* Navigation */}
          <View className="mt-8 gap-3">
            {step < 3 ? (
              <Button onPress={nextStep} label={t('common.next')} />
            ) : (
              <Button
                onPress={handleSubmit}
                label={loading ? t('dogForm.creating') : t('dogForm.createProfile')}
                disabled={loading}
              />
            )}
            {step > 0 && <Button onPress={prevStep} label={t('common.back')} variant="outline" />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
