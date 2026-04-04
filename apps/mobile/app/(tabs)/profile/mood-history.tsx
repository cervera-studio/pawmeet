import type { MoodLog, Serialized } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDateLocale } from '@/lib/i18n';
import { useMoodHistoryViewModel } from './_vm/mood-history.view-model';

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e'] as const;
const STAR_FILLED = '\u2605';
const STAR_EMPTY = '\u2606';

// ── Skeleton ────────────────────────────────────────────────────────────────

function MoodHistorySkeleton() {
  return (
    <View className="px-4 py-4">
      {SKELETON_KEYS.map((id) => (
        <View
          key={id}
          className="mb-3 h-24 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse"
        />
      ))}
    </View>
  );
}

// ── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <Text className="text-base text-yellow-500">
      {Array.from({ length: 5 }, (_, i) => (i < rating ? STAR_FILLED : STAR_EMPTY)).join('')}
    </Text>
  );
}

// ── Mood Tag Chip ───────────────────────────────────────────────────────────

function MoodTagChip({ tag }: { tag: string }) {
  const { t } = useTranslation();
  const tagKey = `moodLog.tags.${tag}`;
  const label = t(tagKey);
  // If translation key not found, i18n returns the key itself
  const displayLabel = label === tagKey ? tag : label;

  return (
    <View className="rounded-full bg-primary/10 dark:bg-primary/20 px-2.5 py-1 mr-1.5 mb-1">
      <Text className="text-xs font-medium text-primary">{displayLabel}</Text>
    </View>
  );
}

// ── Mood Log Row ────────────────────────────────────────────────────────────

function MoodLogRow({ log }: { log: Serialized<MoodLog> }) {
  const { t } = useTranslation();
  const date = new Date(log.createdAt);
  const formattedDate = date.toLocaleDateString(getDateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(getDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  });

  const ratingKey = `moodLog.ratingValues.${log.rating}` as const;
  const ratingLabel = t(ratingKey);

  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-medium text-neutral-900 dark:text-[#F5F5F7]">
            {formattedDate}
          </Text>
          <Text className="text-xs text-neutral-400 dark:text-neutral-500">{formattedTime}</Text>
        </View>
        <View className="items-end">
          <StarRating rating={log.rating} />
          <Text className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
            {ratingLabel}
          </Text>
        </View>
      </View>

      {log.tags.length > 0 && (
        <View className="flex-row flex-wrap mt-3">
          {log.tags.map((tag) => (
            <MoodTagChip key={tag} tag={tag} />
          ))}
        </View>
      )}

      {log.notes ? (
        <Text className="mt-2 text-sm text-neutral-600 dark:text-[#D1D1D6]">{log.notes}</Text>
      ) : null}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function MoodHistoryScreen() {
  const { t } = useTranslation();
  const vm = useMoodHistoryViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('moodHistory.title'),
          headerBackTitle: t('common.back'),
        }}
      />

      {vm.loading && vm.logs.length === 0 ? (
        <MoodHistorySkeleton />
      ) : (
        <FlatList
          data={vm.logs}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-4"
          renderItem={({ item }) => <MoodLogRow log={item} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">{'\u{1F4DD}'}</Text>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center">
                {t('moodHistory.empty')}
              </Text>
            </View>
          }
          refreshing={vm.refreshing}
          onRefresh={vm.refresh}
          onEndReached={vm.hasMore ? () => void vm.loadMore() : undefined}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
