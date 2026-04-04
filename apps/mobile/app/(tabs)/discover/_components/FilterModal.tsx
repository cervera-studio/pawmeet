import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  BEHAVIOR_DOGS_OPTIONS,
  ENERGY_OPTIONS,
  GENDER_OPTIONS,
  SIZE_OPTIONS,
  TERRAIN_OPTIONS,
  WALK_TIME_OPTIONS,
} from '@pawmeet/config';
import type { DiscoveryFilters } from '@pawmeet/types';
import { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { ChipSelect } from '@/components/ChipSelect';
import { FormSection } from '@/components/FormSection';

const DISTANCE_STEPS = [1, 3, 5, 10, 15, 20, 30, 50];

export interface FilterModalRef {
  present: (currentFilters: DiscoveryFilters) => void;
}

interface FilterModalProps {
  onApply: (f: DiscoveryFilters) => void;
  ref: React.Ref<FilterModalRef>;
}

export function FilterModal({ onApply, ref }: FilterModalProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState<DiscoveryFilters>({});
  const snapPoints = useMemo(() => ['92%'], []);

  useImperativeHandle(ref, () => ({
    present(currentFilters: DiscoveryFilters) {
      setDraft(currentFilters);
      bottomSheetRef.current?.present();
    },
  }));

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const updateArrayFilter = useCallback(
    <K extends keyof DiscoveryFilters>(key: K, values: string[]) => {
      setDraft((prev) => ({
        ...prev,
        [key]: values.length > 0 ? values : undefined,
      }));
    },
    [],
  );

  const handleReset = useCallback(() => setDraft({}), []);

  const handleApply = useCallback(() => {
    onApply(draft);
    bottomSheetRef.current?.dismiss();
  }, [draft, onApply]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff' }}
      handleIndicatorStyle={{ backgroundColor: isDark ? '#48484A' : '#D1D5DB', width: 40 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('discovery.filters.title')}
          </Text>
        </View>
        {/* Dog characteristics */}
        <FormSection
          icon="🐾"
          title={t('discovery.filters.dogCharacteristics')}
          description={t('discovery.filters.dogCharacteristicsDesc')}
        >
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.size')}
            </Text>
            <ChipSelect
              options={SIZE_OPTIONS}
              selected={((draft.size as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('size', v)}
              multiple
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.energy')}
            </Text>
            <ChipSelect
              options={ENERGY_OPTIONS}
              selected={((draft.energyLevel as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('energyLevel', v)}
              multiple
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.gender')}
            </Text>
            <ChipSelect
              options={GENDER_OPTIONS}
              selected={((draft.gender as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('gender', v)}
              multiple
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.behavior')}
            </Text>
            <ChipSelect
              options={BEHAVIOR_DOGS_OPTIONS}
              selected={((draft.behaviorWithDogs as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('behaviorWithDogs', v)}
              multiple
            />
          </View>
        </FormSection>

        {/* Walk preferences */}
        <View className="mt-4" />
        <FormSection
          icon="🚶"
          title={t('discovery.filters.walkPreferences')}
          description={t('discovery.filters.walkPreferencesDesc')}
        >
          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.schedule')}
            </Text>
            <ChipSelect
              options={WALK_TIME_OPTIONS}
              selected={((draft.walkPrefTime as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('walkPrefTime', v)}
              multiple
            />
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.terrain')}
            </Text>
            <ChipSelect
              options={TERRAIN_OPTIONS}
              selected={((draft.walkPrefTerrain as string[]) ?? []) as string[]}
              onSelect={(v) => updateArrayFilter('walkPrefTerrain', v)}
              multiple
            />
          </View>
        </FormSection>

        {/* Distance */}
        <View className="mt-4" />
        <FormSection
          icon="📍"
          title={t('discovery.filters.distance')}
          description={t('discovery.filters.distanceDesc')}
        >
          <ChipSelect
            options={DISTANCE_STEPS.map((km) => ({ value: String(km), label: `${km} km` }))}
            selected={draft.maxDistanceKm == null ? '' : String(draft.maxDistanceKm)}
            onSelect={(v: string) =>
              setDraft((prev) => ({
                ...prev,
                maxDistanceKm: v && Number(v) !== prev.maxDistanceKm ? Number(v) : undefined,
              }))
            }
          />
        </FormSection>
        {/* Bottom actions */}
        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={handleReset}
            className="flex-1 rounded-2xl border border-gray-200 py-4 dark:border-[#48484A]"
          >
            <Text className="text-center text-base font-semibold text-gray-700 dark:text-[#D1D1D6]">
              {t('discovery.filters.reset')}
            </Text>
          </Pressable>
          <Pressable onPress={handleApply} className="flex-1 rounded-2xl bg-primary py-4">
            <Text className="text-center text-base font-bold text-white">
              {t('discovery.filters.apply')}
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
