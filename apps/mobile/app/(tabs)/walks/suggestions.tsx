export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useRouter } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WalkSuggestion } from '@/hooks/useWalkSuggestions';
import { useWalkSuggestionsViewModel } from './suggestions.view-model';

// ── Day-of-week labels ──────────────────────────────────────────────────────

const DAY_KEYS = [
  'walks.suggestions.days.sun',
  'walks.suggestions.days.mon',
  'walks.suggestions.days.tue',
  'walks.suggestions.days.wed',
  'walks.suggestions.days.thu',
  'walks.suggestions.days.fri',
  'walks.suggestions.days.sat',
] as const;

// ── Score color ──────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 0.7) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
  if (score >= 0.4)
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
  return 'bg-gray-100 dark:bg-[#48484A] text-gray-600 dark:text-[#D1D1D6]';
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function SuggestionCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]">
      <View className="flex-row items-center justify-between mb-3">
        <View className="h-5 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-6 w-16 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="h-4 w-40 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mb-2" />
      <View className="h-4 w-28 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mb-2" />
      <View className="flex-row gap-2 mt-2">
        <View className="h-8 w-24 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-8 w-24 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
    </View>
  );
}

function SuggestionsLoadingSkeleton() {
  return (
    <View className="px-4 py-3">
      <SuggestionCardSkeleton />
      <SuggestionCardSkeleton />
      <SuggestionCardSkeleton />
    </View>
  );
}

// ── SuggestionCard (memoized) ───────────────────────────────────────────────

const SuggestionCard = memo(function SuggestionCard({
  suggestion,
}: {
  suggestion: WalkSuggestion;
}) {
  const { t } = useTranslation();
  const dayLabel = t(DAY_KEYS[suggestion.timeSlot.dayOfWeek] ?? DAY_KEYS[0]!);
  const timeRange = `${String(suggestion.timeSlot.hourStart).padStart(2, '0')}:00–${String(suggestion.timeSlot.hourEnd).padStart(2, '0')}:00`;
  const terrainLabel = t(
    `discovery.filters.terrainOptions.${suggestion.terrainSuggestion}` as never,
  ) as string;

  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]">
      {/* Header: day/time + score */}
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {dayLabel}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">{timeRange}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${scoreColor(suggestion.score)}`}>
          <Text className="text-xs font-medium">{Math.round(suggestion.score * 100)}%</Text>
        </View>
      </View>

      {/* Details */}
      <View className="flex-row items-center gap-2 mb-1">
        <Text className="text-sm text-gray-500 dark:text-neutral-500">
          {t('walks.suggestions.terrain')}: {terrainLabel}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-sm text-gray-500 dark:text-neutral-500">
          {t('walks.suggestions.duration', { minutes: suggestion.estimatedDurationMin })}
        </Text>
      </View>

      {/* Compatible dogs */}
      {suggestion.nearbyCompatibleDogs.length > 0 && (
        <View className="mt-1">
          <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500 mb-2 uppercase">
            {t('walks.suggestions.compatibleDogs')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {suggestion.nearbyCompatibleDogs.map((dog) => (
              <View
                key={dog.dogId}
                className="flex-row items-center rounded-full bg-gray-50 dark:bg-[#2C2C2E] px-3 py-1.5 border border-gray-100 dark:border-[#38383A]"
              >
                <Text className="text-sm font-medium text-gray-800 dark:text-[#F5F5F7]">
                  {dog.dogName}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-neutral-500 ml-1.5">
                  {Math.round(dog.compatibilityScore * 100)}% · {dog.distanceKm} km
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

SuggestionCard.displayName = 'SuggestionCard';

// ── Empty state ─────────────────────────────────────────────────────────────

function SuggestionsEmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F4A1}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('walks.suggestions.empty')}
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
        {t('walks.suggestions.emptyDescription')}
      </Text>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function WalkSuggestionsScreen() {
  const vm = useWalkSuggestionsViewModel();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-4 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-2xl text-gray-600 dark:text-[#D1D1D6]">{'\u{2190}'}</Text>
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
              {t('walks.suggestions.title')}
            </Text>
            {vm.activeDogName ? (
              <Text className="text-sm text-gray-500 dark:text-neutral-500">
                {t('walks.suggestions.forDog', { name: vm.activeDogName })}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Content */}
      {!vm.hasDogs ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-5xl">{'\u{1F415}'}</Text>
          <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {t('walks.suggestions.noDog')}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
            {t('walks.suggestions.noDogDescription')}
          </Text>
        </View>
      ) : vm.isInitialLoad ? (
        <SuggestionsLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.suggestions}
          keyExtractor={(_, index) => `suggestion-${index}`}
          contentContainerClassName="px-4 py-3"
          onRefresh={vm.refresh}
          refreshing={vm.loading}
          renderItem={({ item }) => <SuggestionCard suggestion={item} />}
          initialNumToRender={5}
          ListEmptyComponent={<SuggestionsEmptyState />}
        />
      )}
    </SafeAreaView>
  );
}
