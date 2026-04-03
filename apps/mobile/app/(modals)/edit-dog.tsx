import { getBreedSize, SIZE_OPTIONS } from '@pawmeet/config';
import type { DogSize, WalkTerrain, WalkTime } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreedAutocomplete } from '@/components/BreedAutocomplete';
import { ChipField } from '@/components/ChipField';
import { DatePickerField } from '@/components/DatePickerField';
import { FormSection } from '@/components/FormSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  BEHAVIOR_DOGS_OPTIONS,
  BEHAVIOR_PEOPLE_OPTIONS,
  ENERGY_OPTIONS,
  GENDER_OPTIONS,
  LEASH_OPTIONS,
  RECALL_OPTIONS,
  TERRAIN_OPTIONS,
  useEditDogViewModel,
  WALK_TIME_OPTIONS,
} from './_vm/edit-dog.view-model';

const NEUTERED_OPTIONS = [
  { value: 'true', labelKey: 'common.yes' },
  { value: 'false', labelKey: 'common.no' },
] as const;

type EditVM = ReturnType<typeof useEditDogViewModel>;
type Form = NonNullable<EditVM['form']>;

function EditFormSections({ vm }: { vm: EditVM & { form: Form } }) {
  const { t } = useTranslation();
  const { form } = vm;

  return (
    <>
      {/* Identita */}
      <FormSection
        icon="📋"
        title={t('dogForm.sections.identity')}
        description={t('dogForm.sections.identityDesc')}
      >
        <Input
          placeholder={t('dogForm.fields.name')}
          value={form.name}
          onChangeText={(v) => vm.setField('name', v)}
        />
        <BreedAutocomplete
          placeholder={t('dogForm.fields.breed')}
          value={form.breed}
          onSelect={(v) => {
            vm.setField('breed', v);
            const size = getBreedSize(v);
            if (size) vm.setField('size', size);
          }}
        />
        {form.breed === 'mixed_breed' && (
          <BreedAutocomplete
            placeholder={t('dogForm.fields.breedSecondary')}
            value={form.breedSecondary}
            onSelect={(v) => vm.setField('breedSecondary', v)}
          />
        )}
        <DatePickerField
          value={form.birthDate ? new Date(form.birthDate) : null}
          onChange={(date) => vm.setField('birthDate', date.toISOString().split('T')[0] ?? '')}
          placeholder={t('dogForm.fields.birthDate')}
          spacingClassName="mb-0"
        />
      </FormSection>

      {/* Fisico */}
      <FormSection
        icon="📏"
        title={t('dogForm.sections.physique')}
        description={t('dogForm.sections.physiqueDesc')}
      >
        <Input
          placeholder={t('dogForm.fields.weightKg')}
          value={form.weightKg}
          onChangeText={(v) => vm.setField('weightKg', v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
        />
        {form.breed === 'mixed_breed' && (
          <ChipField
            label={t('dogForm.fields.size')}
            chipProps={{
              options: SIZE_OPTIONS,
              selected: form.size ?? '',
              onSelect: (v: string) => vm.setField('size', v as DogSize),
              variant: 'scale',
            }}
          />
        )}
        <ChipField
          label={t('dogForm.fields.gender')}
          chipProps={{
            options: GENDER_OPTIONS,
            selected: form.gender ?? '',
            onSelect: (v: string) => vm.setField('gender', v as typeof form.gender),
          }}
        />
        <ChipField
          label={t('dogForm.fields.neutered')}
          chipProps={{
            options: NEUTERED_OPTIONS,
            selected: form.isNeutered == null ? '' : String(form.isNeutered),
            onSelect: (v: string) => vm.setField('isNeutered', v === 'true'),
          }}
        />
      </FormSection>

      {/* Bio */}
      <FormSection
        icon="✏️"
        title={t('dogForm.sections.bio')}
        description={t('dogForm.sections.bioDesc')}
      >
        <Input
          placeholder={t('dogForm.fields.bio')}
          value={form.bio}
          onChangeText={(v) => vm.setField('bio', v)}
          multiline
          numberOfLines={3}
        />
      </FormSection>

      {/* Carattere */}
      <FormSection
        icon="🐕"
        title={t('dogForm.sections.character')}
        description={t('dogForm.sections.characterDesc')}
      >
        <ChipField
          label={t('dogForm.fields.energy')}
          hint={t('dogForm.hints.energy')}
          chipProps={{
            options: ENERGY_OPTIONS,
            selected: form.energyLevel ?? '',
            onSelect: (v: string) => vm.setField('energyLevel', v as typeof form.energyLevel),
            variant: 'scale',
          }}
        />
        <ChipField
          label={t('dogForm.fields.behaviorDogs')}
          hint={t('dogForm.hints.behaviorDogs')}
          chipProps={{
            options: BEHAVIOR_DOGS_OPTIONS,
            selected: form.behaviorWithDogs ?? '',
            onSelect: (v: string) =>
              vm.setField('behaviorWithDogs', v as typeof form.behaviorWithDogs),
          }}
        />
        <ChipField
          label={t('dogForm.fields.behaviorPeople')}
          hint={t('dogForm.hints.behaviorPeople')}
          chipProps={{
            options: BEHAVIOR_PEOPLE_OPTIONS,
            selected: form.behaviorWithPeople ?? '',
            onSelect: (v: string) =>
              vm.setField('behaviorWithPeople', v as typeof form.behaviorWithPeople),
          }}
        />
      </FormSection>

      {/* Addestramento */}
      <FormSection
        icon="🎓"
        title={t('dogForm.sections.training')}
        description={t('dogForm.sections.trainingDesc')}
      >
        <ChipField
          label={t('dogForm.fields.leash')}
          hint={t('dogForm.hints.leash')}
          chipProps={{
            options: LEASH_OPTIONS,
            selected: form.leashBehavior ?? '',
            onSelect: (v: string) => vm.setField('leashBehavior', v as typeof form.leashBehavior),
          }}
        />
        <ChipField
          label={t('dogForm.fields.recall')}
          hint={t('dogForm.hints.recall')}
          optional
          chipProps={{
            options: RECALL_OPTIONS,
            selected: form.recallReliability ?? '',
            onSelect: (v: string) =>
              vm.setField('recallReliability', v as typeof form.recallReliability),
            variant: 'scale',
          }}
        />
      </FormSection>

      {/* Orari */}
      <FormSection
        icon="🕐"
        title={t('dogForm.sections.schedule')}
        description={t('dogForm.sections.scheduleDesc')}
      >
        <ChipField
          label={t('dogForm.fields.walkTimes')}
          hint={t('dogForm.hints.walkTimes')}
          chipProps={{
            options: WALK_TIME_OPTIONS,
            selected: form.walkPrefTime,
            onSelect: (v: string[]) => vm.setField('walkPrefTime', v as WalkTime[]),
            multiple: true,
          }}
        />
      </FormSection>

      {/* Percorso */}
      <FormSection
        icon="🌳"
        title={t('dogForm.sections.terrain')}
        description={t('dogForm.sections.terrainDesc')}
      >
        <ChipField
          label={t('dogForm.fields.walkTerrain')}
          hint={t('dogForm.hints.walkTerrain')}
          chipProps={{
            options: TERRAIN_OPTIONS,
            selected: form.walkPrefTerrain,
            onSelect: (v: string[]) => vm.setField('walkPrefTerrain', v as WalkTerrain[]),
            multiple: true,
          }}
        />
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
            {t('dogForm.fields.durationMin')}
          </Text>
          <Input
            placeholder="30"
            value={form.walkPrefDurationMin}
            onChangeText={(v) => vm.setField('walkPrefDurationMin', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
            {t('dogForm.fields.durationMax')}
          </Text>
          <Input
            placeholder="60"
            value={form.walkPrefDurationMax}
            onChangeText={(v) => vm.setField('walkPrefDurationMax', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </View>
      </FormSection>

      {/* Foto */}
      <FormSection
        icon="📸"
        title={t('dogForm.sections.photos')}
        description={t('dogForm.sections.photosDesc')}
      >
        <View className="flex-row flex-wrap gap-3">
          {vm.photos.map((photo, index) => (
            <View key={photo.id} className="relative">
              <Image
                source={{ uri: photo.url }}
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
                onPress={() => vm.handleDeletePhoto(photo.id)}
                className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500"
              >
                <Text className="text-xs font-bold text-white">✕</Text>
              </Pressable>
            </View>
          ))}
          {vm.photos.length < 6 && (
            <Pressable
              onPress={vm.handleUploadPhoto}
              disabled={vm.uploading}
              className="h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 dark:border-[#38383A]"
            >
              {vm.uploading ? (
                <ActivityIndicator size="small" />
              ) : (
                <>
                  <Text className="text-3xl text-gray-300 dark:text-neutral-500">+</Text>
                  <Text className="text-[10px] text-gray-400 dark:text-neutral-500">
                    {t('dogForm.photosAdd')}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </FormSection>
    </>
  );
}

export default function EditDogScreen() {
  const { t } = useTranslation();
  const vm = useEditDogViewModel();

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!vm.form) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <Text className="text-base text-red-500">
          {vm.apiError || t('profile.dogDetail.notFound')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: t('dogForm.editTitle', { name: vm.dog?.name ?? '' }) }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <ScrollView contentContainerClassName="px-6 py-4 pb-16" keyboardShouldPersistTaps="handled">
          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600 dark:text-red-400">{vm.apiError}</Text>
            </View>
          ) : null}

          <EditFormSections vm={vm as EditVM & { form: Form }} />

          <Button
            onPress={vm.handleSave}
            label={vm.saving ? t('dogForm.saving') : t('dogForm.saveChanges')}
            disabled={vm.saving}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
