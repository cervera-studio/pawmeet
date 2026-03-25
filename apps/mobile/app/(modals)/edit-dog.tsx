import type { WalkTerrain, WalkTime } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipSelect } from '@/components/ChipSelect';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  BEHAVIOR_DOGS_OPTIONS,
  BEHAVIOR_PEOPLE_OPTIONS,
  ENERGY_OPTIONS,
  GENDER_OPTIONS,
  LEASH_OPTIONS,
  RECALL_OPTIONS,
  SIZE_OPTIONS,
  TERRAIN_OPTIONS,
  useEditDogViewModel,
  WALK_TIME_OPTIONS,
} from './_vm/edit-dog.view-model';

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

          {/* ── Info base ── */}
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('dogForm.sections.basicInfo')}
          </Text>
          <View className="gap-3 mb-6">
            <Input
              placeholder={t('dogForm.fields.name')}
              value={vm.form.name}
              onChangeText={(v) => vm.setField('name', v)}
            />
            <Input
              placeholder={t('dogForm.fields.breed')}
              value={vm.form.breed}
              onChangeText={(v) => vm.setField('breed', v)}
            />
            <Input
              placeholder={t('dogForm.fields.breedSecondary')}
              value={vm.form.breedSecondary}
              onChangeText={(v) => vm.setField('breedSecondary', v)}
            />
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.size')}
              </Text>
              <ChipSelect
                options={SIZE_OPTIONS}
                selected={vm.form.size}
                onSelect={(v) => vm.setField('size', v)}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.gender')}
              </Text>
              <ChipSelect
                options={GENDER_OPTIONS}
                selected={vm.form.gender}
                onSelect={(v) => vm.setField('gender', v)}
              />
            </View>
            <Input
              placeholder={t('dogForm.fields.bio')}
              value={vm.form.bio}
              onChangeText={(v) => vm.setField('bio', v)}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Temperamento ── */}
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('dogForm.sections.temperament')}
          </Text>
          <View className="gap-4 mb-6">
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.energy')}
              </Text>
              <ChipSelect
                options={ENERGY_OPTIONS}
                selected={vm.form.energyLevel}
                onSelect={(v) => vm.setField('energyLevel', v)}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.behaviorDogs')}
              </Text>
              <ChipSelect
                options={BEHAVIOR_DOGS_OPTIONS}
                selected={vm.form.behaviorWithDogs}
                onSelect={(v) => vm.setField('behaviorWithDogs', v)}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.behaviorPeople')}
              </Text>
              <ChipSelect
                options={BEHAVIOR_PEOPLE_OPTIONS}
                selected={vm.form.behaviorWithPeople}
                onSelect={(v) => vm.setField('behaviorWithPeople', v)}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.leash')}
              </Text>
              <ChipSelect
                options={LEASH_OPTIONS}
                selected={vm.form.leashBehavior}
                onSelect={(v) => vm.setField('leashBehavior', v)}
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.recall')}
              </Text>
              <ChipSelect
                options={RECALL_OPTIONS}
                selected={vm.form.recallReliability}
                onSelect={(v) => vm.setField('recallReliability', v)}
              />
            </View>
          </View>

          {/* ── Passeggiate ── */}
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('dogForm.sections.walks')}
          </Text>
          <View className="gap-4 mb-6">
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.walkTimes')}
              </Text>
              <ChipSelect
                options={WALK_TIME_OPTIONS}
                selected={vm.form.walkPrefTime}
                onSelect={(v) => vm.setField('walkPrefTime', v as WalkTime[])}
                multiple
              />
            </View>
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('dogForm.fields.walkTerrain')}
              </Text>
              <ChipSelect
                options={TERRAIN_OPTIONS}
                selected={vm.form.walkPrefTerrain}
                onSelect={(v) => vm.setField('walkPrefTerrain', v as WalkTerrain[])}
                multiple
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-700 dark:text-[#D1D1D6]">
                  {t('dogForm.fields.durationMin')}
                </Text>
                <Input
                  value={vm.form.walkPrefDurationMin}
                  onChangeText={(v) => vm.setField('walkPrefDurationMin', v)}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-sm text-gray-700 dark:text-[#D1D1D6]">
                  {t('dogForm.fields.durationMax')}
                </Text>
                <Input
                  value={vm.form.walkPrefDurationMax}
                  onChangeText={(v) => vm.setField('walkPrefDurationMax', v)}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* ── Foto ── */}
          <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('dogForm.sections.photos')}
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
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

          {/* ── Save ── */}
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
