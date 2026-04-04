export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Ionicons } from '@expo/vector-icons';
import { formatBreedName, formatDogAge } from '@pawmeet/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { DogSelector } from '@/components/DogSelector';
import { ExplanationModal } from '@/components/ExplanationModal';
import { MatchCelebration } from '@/components/MatchCelebration';
import { RequireDogModal } from '@/components/RequireDogModal';
import { SwipeCard, type SwipeCardRef } from '@/components/SwipeCard';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { useRequireDog } from '@/hooks/useRequireDog';
import { ActionButton } from './_components/ActionButton';
import { FilterModal, type FilterModalRef } from './_components/FilterModal';
import { useDiscoveryViewModel } from './_vm/index.view-model';

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const vm = useDiscoveryViewModel();
  const analytics = useAnalyticsService();
  const [explanationVisible, setExplanationVisible] = useState(false);
  const { hasDog, showGate, setShowGate, dismissGate, goToAddDog } = useRequireDog();
  const cardRef = useRef<SwipeCardRef>(null);
  const filterRef = useRef<FilterModalRef>(null);

  useEffect(() => {
    if (!hasDog) setShowGate(true);
  }, [hasDog, setShowGate]);

  const openFilters = useCallback(() => {
    filterRef.current?.present(vm.filters);
  }, [vm.filters]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-[#1A1A1C]">
      <RequireDogModal visible={showGate} onDismiss={dismissGate} onAddDog={goToAddDog} />

      <DogSelector />

      <View className="flex-1">
        {vm.dogs.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
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
          <View className="flex-1 items-center justify-center">
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
          <>
            <SwipeCard
              key={vm.currentProfile.dog.id}
              ref={cardRef}
              dog={{
                dogId: vm.currentProfile.dog.id,
                name: vm.currentProfile.dog.name,
                breed: formatBreedName(vm.currentProfile.dog.breed),
                age: formatDogAge(new Date(vm.currentProfile.dog.birthDate)),
                distanceKm: vm.currentProfile.distanceKm,
                compatibilityScore: vm.currentProfile.compatibilityScore,
                ownerName: vm.currentProfile.ownerDisplayName ?? '',
                imageUrl: vm.currentProfile.primaryPhotoUrl ?? null,
                scoreBreakdown: vm.currentProfile.scoreBreakdown,
              }}
              onSwipeRight={vm.handleSwipeRight}
              onSwipeLeft={vm.handleSwipeLeft}
              onExplanationTap={() => {
                setExplanationVisible(true);
                analytics.track('match_explanation_viewed', {
                  source: 'swipe_card',
                  overallScore: vm.currentProfile?.compatibilityScore ?? 0,
                });
              }}
            />

            {/* Filter button — overlaid top-right */}
            <Pressable
              onPress={openFilters}
              className="absolute top-12 right-4 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/20"
            >
              <Ionicons
                name="options"
                size={22}
                color={vm.activeFilterCount > 0 ? '#C8A96E' : '#fff'}
              />
              {vm.activeFilterCount > 0 && (
                <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Text className="text-xs font-bold text-white">{vm.activeFilterCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Action buttons — overlaid on the card's bottom edge */}
            {!vm.newMatch?.isMatch && (
              <View className="absolute bottom-4 left-0 right-0 z-10 flex-row items-center justify-center gap-6">
                <ActionButton
                  onPress={() => cardRef.current?.animateLeft()}
                  size="lg"
                  bgClass="bg-white/90 dark:bg-[#2C2C2E]/90"
                >
                  <Text className="text-2xl font-bold text-red-400">✕</Text>
                </ActionButton>
                <ActionButton
                  onPress={() => cardRef.current?.animateRight()}
                  size="lg"
                  bgClass="bg-primary"
                >
                  <Text className="text-2xl">🐾</Text>
                </ActionButton>
              </View>
            )}
          </>
        ) : null}

        {vm.dogs.length > 0 &&
        vm.coordinates &&
        !vm.isLoading &&
        !(vm.currentProfile && vm.hasMore) ? (
          <View className="flex-1 items-center justify-center">
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
          <View className="flex-1 items-center justify-center px-8">
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

      {/* Filter bottom sheet */}
      <FilterModal ref={filterRef} onApply={vm.handleApplyFilters} />

      {/* Explanation modal */}
      <ExplanationModal
        visible={explanationVisible}
        onClose={() => setExplanationVisible(false)}
        overallScore={vm.currentProfile?.compatibilityScore ?? 0}
        breakdown={vm.currentProfile?.scoreBreakdown ?? null}
      />
    </View>
  );
}
