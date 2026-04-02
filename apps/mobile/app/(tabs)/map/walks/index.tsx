export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { WALK_STATUS } from '@pawmeet/types';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedbackModal } from '@/components/FeedbackModal';
import { getDateLocale } from '@/lib/i18n';
import type { Walk } from './_vm/index.view-model';
import { useWalksViewModel } from './_vm/index.view-model';

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString(getDateLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
}

const STATUS_KEY_MAP: Record<string, string> = {
  [WALK_STATUS.PENDING]: 'walks.status.pending',
  [WALK_STATUS.ACCEPTED]: 'walks.status.accepted',
  [WALK_STATUS.DECLINED]: 'walks.status.declined',
  [WALK_STATUS.CANCELLED]: 'walks.status.cancelled',
  [WALK_STATUS.COMPLETED]: 'walks.status.completed',
};

function statusColor(status: string): string {
  switch (status) {
    case WALK_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case WALK_STATUS.ACCEPTED:
      return 'bg-green-100 text-green-800';
    case WALK_STATUS.DECLINED:
      return 'bg-red-100 text-red-800';
    case WALK_STATUS.COMPLETED:
      return 'bg-blue-100 text-blue-800';
    case WALK_STATUS.CANCELLED:
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function WalkCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]">
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <View className="h-5 w-28 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          <View className="mt-1 h-4 w-20 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        </View>
        <View className="h-6 w-20 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="h-4 w-40 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-1" />
      <View className="h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mt-1" />
    </View>
  );
}

function WalksLoadingSkeleton() {
  return (
    <View className="px-4 py-3">
      <WalkCardSkeleton />
      <WalkCardSkeleton />
      <WalkCardSkeleton />
    </View>
  );
}

// ── WalkCard (memoized) ──────────────────────────────────────────────────────

const WalkCard = memo(function WalkCard({
  walk,
  userId,
  onAccept,
  onDecline,
  onCancel,
  onFeedback,
}: {
  walk: Walk;
  userId: string;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onFeedback: () => void;
}) {
  const { t } = useTranslation();
  const isMine = walk.createdBy === userId;
  const isPending = walk.status === WALK_STATUS.PENDING;
  const isAccepted = walk.status === WALK_STATUS.ACCEPTED;
  const isCompleted = walk.status === WALK_STATUS.COMPLETED;

  const statusKey = STATUS_KEY_MAP[walk.status];
  const label = statusKey ? t(statusKey) : walk.status;

  return (
    <View className="mb-3 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm border border-gray-100 dark:border-[#38383A]">
      {/* Header with date and status */}
      <View className="flex-row items-center justify-between mb-2">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
            {formatDate(walk.scheduledAt)}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-neutral-500">
            {formatTime(walk.scheduledAt)} - {walk.durationMin} min
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusColor(walk.status)}`}>
          <Text className="text-xs font-medium">
            {isPending && isMine ? t('walks.status.pending') : label}
          </Text>
        </View>
      </View>

      {/* Title and location */}
      {walk.title && (
        <Text className="text-base font-medium text-gray-800 dark:text-[#F5F5F7] mb-1">
          {walk.title}
        </Text>
      )}
      {walk.location && (
        <View className="flex-row items-center mb-1">
          <Text className="text-sm text-gray-500 dark:text-neutral-500">{walk.location}</Text>
        </View>
      )}
      {walk.notes && (
        <Text className="text-sm text-gray-400 dark:text-neutral-500 mb-2">{walk.notes}</Text>
      )}

      {/* Action buttons */}
      {isPending && !isMine && (
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={onAccept}
            className="flex-1 items-center rounded-xl bg-green-500 py-3"
          >
            <Text className="font-semibold text-white">{t('common.accept')}</Text>
          </Pressable>
          <Pressable onPress={onDecline} className="flex-1 items-center rounded-xl bg-red-100 py-3">
            <Text className="font-semibold text-red-600">{t('common.decline')}</Text>
          </Pressable>
        </View>
      )}

      {((isPending && isMine) || isAccepted) && (
        <View className="mt-2">
          <Pressable
            onPress={onCancel}
            className="items-center rounded-xl bg-gray-100 dark:bg-[#38383A] py-3"
          >
            <Text className="font-semibold text-gray-600 dark:text-[#D1D1D6]">
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      )}

      {isCompleted && (
        <View className="mt-2">
          <Pressable onPress={onFeedback} className="items-center rounded-xl bg-primary py-3">
            <Text className="font-semibold text-white">{t('walks.leaveFeedback')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

WalkCard.displayName = 'WalkCard';

// ── Empty state ──────────────────────────────────────────────────────────────

function WalksEmptyState() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F5D3}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('walks.noWalks')}
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
        {t('walks.noWalksDescription')}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WalksScreen() {
  const vm = useWalksViewModel();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('walks.title')}
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => router.push('/(tabs)/map/walks/suggestions')}
            className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-2"
          >
            <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {t('walks.suggestions.button')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/map/walks/calendar')}
            className="rounded-full bg-gray-100 dark:bg-[#38383A] px-4 py-2"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-[#D1D1D6]">
              {t('walks.calendar')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/map/walks/tracking')}
            className="rounded-full bg-emerald-700 px-4 py-2"
          >
            <Text className="text-sm font-semibold text-white">{t('walks.track')}</Text>
          </Pressable>
        </View>
      </View>

      {vm.isInitialLoad ? (
        <WalksLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.upcomingWalks}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-3"
          onRefresh={vm.fetchUpcoming}
          refreshing={vm.loading}
          renderItem={({ item }) => (
            <WalkCard
              walk={item}
              userId={vm.userId}
              onAccept={() => vm.handleAccept(item.id)}
              onDecline={() => vm.handleDecline(item.id)}
              onCancel={() => vm.handleCancel(item.id)}
              onFeedback={() => vm.handleFeedback(item)}
            />
          )}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          ListEmptyComponent={<WalksEmptyState />}
        />
      )}

      {vm.feedbackTarget && (
        <FeedbackModal
          visible
          walkId={vm.feedbackTarget.walkId}
          toDogId={vm.feedbackTarget.toDogId}
          onClose={vm.handleFeedbackClose}
          onSubmit={vm.handleFeedbackSubmit}
        />
      )}
    </SafeAreaView>
  );
}
