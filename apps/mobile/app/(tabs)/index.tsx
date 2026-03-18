export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { DiscoveryFilters } from '@pawmeet/types';
import { formatDogAge } from '@pawmeet/utils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogSelector } from '@/components/DogSelector';
import { ExplanationModal } from '@/components/ExplanationModal';
import { MatchCelebration } from '@/components/MatchCelebration';
import { SwipeCard } from '@/components/SwipeCard';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { useDiscoveryViewModel } from './index.view-model';

// ── Filter configuration ────────────────────────────────────────────────────

type FilterSection<K extends keyof DiscoveryFilters> = {
  key: K;
  label: string;
  options: { value: string; label: string }[];
};

const getFilterSections = (t: (key: string) => string): FilterSection<keyof DiscoveryFilters>[] => [
  {
    key: 'size',
    label: t('discovery.filters.size'),
    options: [
      { value: 'toy', label: t('discovery.sizeOptions.toy') },
      { value: 'piccola', label: t('discovery.sizeOptions.piccola') },
      { value: 'media', label: t('discovery.sizeOptions.media') },
      { value: 'grande', label: t('discovery.sizeOptions.grande') },
      { value: 'gigante', label: t('discovery.sizeOptions.gigante') },
    ],
  },
  {
    key: 'energyLevel',
    label: t('discovery.filters.energy'),
    options: [
      { value: 'bassa', label: t('discovery.energyOptions.bassa') },
      { value: 'media', label: t('discovery.energyOptions.media') },
      { value: 'alta', label: t('discovery.energyOptions.alta') },
      { value: 'molto_alta', label: t('discovery.energyOptions.molto_alta') },
    ],
  },
  {
    key: 'gender',
    label: t('discovery.filters.gender'),
    options: [
      { value: 'maschio', label: t('discovery.genderOptions.maschio') },
      { value: 'femmina', label: t('discovery.genderOptions.femmina') },
    ],
  },
  {
    key: 'behaviorWithDogs',
    label: t('discovery.filters.behavior'),
    options: [
      { value: 'molto_socievole', label: t('discovery.behaviorOptions.molto_socievole') },
      { value: 'socievole', label: t('discovery.behaviorOptions.socievole') },
      { value: 'selettivo', label: t('discovery.behaviorOptions.selettivo') },
      { value: 'reattivo', label: t('discovery.behaviorOptions.reattivo') },
    ],
  },
  {
    key: 'walkPrefTime',
    label: t('discovery.filters.schedule'),
    options: [
      { value: 'mattina_presto', label: t('discovery.scheduleOptions.mattina_presto') },
      { value: 'mattina', label: t('discovery.scheduleOptions.mattina') },
      { value: 'pomeriggio', label: t('discovery.scheduleOptions.pomeriggio') },
      { value: 'sera', label: t('discovery.scheduleOptions.sera') },
      { value: 'sera_tardi', label: t('discovery.scheduleOptions.sera_tardi') },
    ],
  },
  {
    key: 'walkPrefTerrain',
    label: t('discovery.filters.terrain'),
    options: [
      { value: 'urbano', label: t('discovery.terrainOptions.urbano') },
      { value: 'parco', label: t('discovery.terrainOptions.parco') },
      { value: 'campagna', label: t('discovery.terrainOptions.campagna') },
      { value: 'spiaggia', label: t('discovery.terrainOptions.spiaggia') },
      { value: 'montagna', label: t('discovery.terrainOptions.montagna') },
    ],
  },
];

const DISTANCE_STEPS = [1, 3, 5, 10, 15, 20, 30, 50];

// ── Chip component ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full px-4 py-2 ${selected ? 'bg-primary' : 'bg-gray-200 dark:bg-[#48484A]'}`}
    >
      <Text
        className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Filter modal ────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: DiscoveryFilters;
  onApply: (f: DiscoveryFilters) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DiscoveryFilters>(filters);

  // Sync draft when modal opens
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const filterSections = getFilterSections(t);

  const toggleValue = (key: keyof DiscoveryFilters, value: string) => {
    setDraft((prev) => {
      const current = (prev[key] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next.length > 0 ? next : undefined };
    });
  };

  const handleReset = () => setDraft({});

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white dark:bg-[#1C1C1E] px-5 pb-8 pt-4">
          {/* Handle bar */}
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-[#48484A]" />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
              {t('discovery.filters.title')}
            </Text>
            <Pressable onPress={handleReset}>
              <Text className="font-semibold text-primary">{t('discovery.filters.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {filterSections.map((section) => (
              <View key={section.key} className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-[#D1D1D6]">
                  {section.label}
                </Text>
                <View className="flex-row flex-wrap">
                  {section.options.map((opt) => {
                    const selected = ((draft[section.key] as string[] | undefined) ?? []).includes(
                      opt.value,
                    );
                    return (
                      <FilterChip
                        key={opt.value}
                        label={opt.label}
                        selected={selected}
                        onPress={() => toggleValue(section.key, opt.value)}
                      />
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Distance slider (discrete steps) */}
            <View className="mb-5">
              <Text className="mb-2 text-sm font-semibold text-gray-600 dark:text-[#D1D1D6]">
                {t('discovery.filters.maxDistance')}
                {draft.maxDistanceKm ? ` — ${draft.maxDistanceKm} km` : ''}
              </Text>
              <View className="flex-row flex-wrap">
                {DISTANCE_STEPS.map((km) => (
                  <FilterChip
                    key={km}
                    label={`${km} km`}
                    selected={draft.maxDistanceKm === km}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        maxDistanceKm: prev.maxDistanceKm === km ? undefined : km,
                      }))
                    }
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={handleApply} className="mt-2 rounded-2xl bg-primary py-4">
            <Text className="text-center text-base font-bold text-white">
              {t('discovery.filters.apply')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Discovery screen ────────────────────────────────────────────────────────

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const vm = useDiscoveryViewModel();
  const analytics = useAnalyticsService();
  const [explanationVisible, setExplanationVisible] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('discovery.title')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {t('discovery.subtitle')}
          </Text>
        </View>
        <Pressable
          onPress={vm.openFilterModal}
          className="relative h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] shadow-sm"
        >
          <Text className="text-lg">{vm.activeFilterCount > 0 ? '\u2699\uFE0F' : '\u2699'}</Text>
          {vm.activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Text className="text-xs font-bold text-white">{vm.activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Dog selector (visible only with multiple dogs) */}
      <DogSelector />

      {/* Card area */}
      <View className="flex-1 items-center justify-center px-4">
        {vm.dogs.length === 0 ? (
          <View className="items-center px-8">
            <Text className="text-5xl">{'\u{1F436}'}</Text>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('discovery.addYourDog')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
              {t('discovery.addDogDescription')}
            </Text>
            <Pressable
              onPress={vm.navigateToAddDog}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">{t('discovery.addDogButton')}</Text>
            </Pressable>
          </View>
        ) : null}
        {vm.dogs.length > 0 && vm.coordinates && vm.isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#065F46" />
            <Text className="mt-4 text-gray-400 dark:text-neutral-500">
              {t('discovery.searchingDogs')}
            </Text>
          </View>
        ) : null}
        {vm.dogs.length > 0 &&
        vm.coordinates &&
        !vm.isLoading &&
        vm.currentProfile &&
        vm.hasMore ? (
          <SwipeCard
            dog={{
              dogId: vm.currentProfile.dog.id,
              name: vm.currentProfile.dog.name,
              breed: vm.currentProfile.dog.breed,
              age: formatDogAge(new Date(vm.currentProfile.dog.birthDate)),
              distanceKm: vm.currentProfile.distanceKm,
              compatibilityScore: vm.currentProfile.compatibilityScore,
              ownerName: vm.currentProfile.dog.ownerId,
              imageUrl: null,
              scoreBreakdown: vm.currentProfile.scoreBreakdown,
            }}
            onSwipeRight={vm.handleSwipeRight}
            onSwipeLeft={vm.handleSwipeLeft}
            onSwipeUp={vm.handleSuperLike}
            onExplanationTap={() => {
              setExplanationVisible(true);
              analytics.track('match_explanation_viewed', {
                source: 'swipe_card',
                overallScore: vm.currentProfile?.compatibilityScore ?? 0,
              });
            }}
          />
        ) : null}
        {vm.dogs.length > 0 &&
        vm.coordinates &&
        !vm.isLoading &&
        !(vm.currentProfile && vm.hasMore) ? (
          <View className="items-center">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('discovery.noMoreProfiles')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
              {t('discovery.noMoreProfilesDescription')}
            </Text>
            <Pressable
              onPress={vm.fetchSuggestions}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">{t('discovery.refresh')}</Text>
            </Pressable>
          </View>
        ) : null}
        {vm.dogs.length > 0 && !vm.coordinates ? (
          <View className="items-center px-8">
            <Text className="text-5xl">📍</Text>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('discovery.locationRequired')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500">
              {t('discovery.locationDescription')}
            </Text>
            <Pressable
              onPress={vm.getCurrentLocation}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">{t('discovery.enableLocation')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Action buttons */}
      {vm.currentProfile && vm.hasMore && (
        <View className="flex-row items-center justify-center gap-6 pb-4">
          <Pressable
            onPress={vm.handleSwipeLeft}
            className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-[#1C1C1E] shadow-md"
          >
            <Text className="text-2xl">✕</Text>
          </Pressable>
          <Pressable
            onPress={vm.handleSuperLike}
            className="h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-md"
          >
            <Text className="text-xl text-white">★</Text>
          </Pressable>
          <Pressable
            onPress={vm.handleSwipeRight}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md"
          >
            <Text className="text-2xl">🐾</Text>
          </Pressable>
        </View>
      )}

      {/* Match celebration overlay */}
      {vm.newMatch?.isMatch && (
        <MatchCelebration
          onDismiss={vm.dismissMatch}
          onChat={() => {
            vm.dismissMatch();
            if (vm.newMatch?.match) {
              vm.navigateToChat(vm.newMatch.match.id);
            }
          }}
        />
      )}

      {/* Filter modal */}
      <FilterModal
        visible={vm.filterModalVisible}
        filters={vm.filters}
        onApply={vm.handleApplyFilters}
        onClose={vm.closeFilterModal}
      />

      {/* Explanation modal */}
      <ExplanationModal
        visible={explanationVisible}
        onClose={() => setExplanationVisible(false)}
        overallScore={vm.currentProfile?.compatibilityScore ?? 0}
        breakdown={vm.currentProfile?.scoreBreakdown ?? null}
      />
    </SafeAreaView>
  );
}
