export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { ScoreBreakdown } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExplanationModal } from '@/components/ExplanationModal';
import { MatchCard } from '@/components/MatchCard';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { api } from '@/lib/trpc';
import type { EnrichedMatch } from './matches.view-model';
import { useMatchesViewModel } from './matches.view-model';

// ── Loading skeleton ──────────────────────────────────────────────────────────

function MatchCardSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      <View className="ml-3 flex-1">
        <View className="h-4 w-36 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="mt-2 h-3 w-24 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="mt-1 h-3 w-20 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="h-3 w-12 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
    </View>
  );
}

function MatchesLoadingSkeleton() {
  return (
    <View className="px-4 py-2">
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function MatchesEmptyState({ onDiscover }: { onDiscover: () => void }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F415}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('matches.noMatches')}
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
        {t('matches.noMatchesDescription')}
      </Text>
      <Pressable onPress={onDiscover} className="mt-6 rounded-2xl bg-primary px-8 py-3">
        <Text className="font-semibold text-white">{t('matches.discoverButton')}</Text>
      </Pressable>
    </View>
  );
}

// ── Estimated item height for getItemLayout (card height ~80px) ──────────────

const MATCH_CARD_HEIGHT = 84;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const { t } = useTranslation();
  const vm = useMatchesViewModel();
  const analytics = useAnalyticsService();
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationData, setExplanationData] = useState<{
    overallScore: number;
    breakdown: ScoreBreakdown | null;
  }>({ overallScore: 0, breakdown: null });

  const handleExplanationTap = useCallback(
    async (matchId: string, compatibilityScore: number) => {
      setExplanationData({ overallScore: compatibilityScore, breakdown: null });
      setExplanationVisible(true);
      setExplanationLoading(true);
      analytics.track('match_explanation_viewed', {
        source: 'match_card',
        overallScore: compatibilityScore,
      });
      try {
        const result = await api.matchingAi.matchExplanation.query({ matchId });
        setExplanationData({
          overallScore: result.overallScore,
          breakdown: {
            sizeScore: result.breakdown.size.score,
            energyScore: result.breakdown.energy.score,
            behaviorScore: result.breakdown.behavior.score,
            walkScore: result.breakdown.walk.score,
            distanceScore: result.breakdown.distance.score,
            leashScore: result.breakdown.leash.score,
            overallScore: result.overallScore,
          },
        });
      } catch (e) {
        logger.warn('MatchesScreen', 'Failed to fetch explanation', e);
      } finally {
        setExplanationLoading(false);
      }
    },
    [analytics],
  );

  const renderItem = useCallback(
    ({ item }: { item: EnrichedMatch }) => (
      <Pressable onPress={() => vm.navigateToChat(item.id)}>
        <MatchCard
          dogName={item.otherDog.name}
          ownerName={item.otherOwner.displayName}
          breed={item.otherDog.breed}
          matchedAt={String(item.createdAt)}
          compatibilityScore={item.compatibilityScore}
          myDogName={vm.hasMultipleDogs ? vm.dogNameById.get(item.dogId) : undefined}
          onCompatibilityTap={() => handleExplanationTap(item.id, item.compatibilityScore ?? 0)}
        />
      </Pressable>
    ),
    [vm.navigateToChat, vm.hasMultipleDogs, vm.dogNameById, handleExplanationTap],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<EnrichedMatch> | null | undefined, index: number) => ({
      length: MATCH_CARD_HEIGHT,
      offset: MATCH_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <View className="border-b border-gray-100 dark:border-[#38383A] px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('matches.title')}
        </Text>
      </View>

      {/* Dog filter chips (only for multi-dog users) */}
      {vm.hasMultipleDogs && (
        <View className="border-b border-gray-100 dark:border-[#38383A] px-4 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => vm.setFilterDogId(null)}
                className={`rounded-full px-4 py-2 ${vm.filterDogId ? 'bg-gray-100 dark:bg-[#38383A]' : 'bg-primary'}`}
              >
                <Text
                  className={`text-sm font-medium ${vm.filterDogId ? 'text-gray-700 dark:text-[#D1D1D6]' : 'text-white'}`}
                >
                  {t('common.all')}
                </Text>
              </Pressable>
              {vm.dogs.map((dog) => (
                <Pressable
                  key={dog.id}
                  onPress={() => vm.setFilterDogId(dog.id === vm.filterDogId ? null : dog.id)}
                  className={`rounded-full px-4 py-2 ${
                    vm.filterDogId === dog.id ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      vm.filterDogId === dog.id ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
                    }`}
                  >
                    {dog.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {vm.isInitialLoad ? (
        <MatchesLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-2"
          onRefresh={vm.fetchMatches}
          refreshing={vm.loading}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          ListEmptyComponent={<MatchesEmptyState onDiscover={vm.navigateToDiscover} />}
        />
      )}

      <ExplanationModal
        visible={explanationVisible}
        onClose={() => setExplanationVisible(false)}
        overallScore={explanationData.overallScore}
        breakdown={explanationData.breakdown}
        loading={explanationLoading}
      />
    </SafeAreaView>
  );
}
