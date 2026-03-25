import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useStoryViewersViewModel } from './_vm/story-viewers.view-model';

// ── Time formatting ─────────────────────────────────────────────────────

function useFormatTimeAgo() {
  const { t } = useTranslation();

  return (date: Date | string): string => {
    const now = Date.now();
    const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return t('common.now');
    if (diffMin < 60) return t('common.minuteAgo', { count: diffMin });

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t('common.hourAgo', { count: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    return t('common.dayAgo', { count: diffDays });
  };
}

// ── Loading Skeleton ────────────────────────────────────────────────────

function ViewersSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          <View className="flex-1">
            <View className="h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          </View>
          <View className="h-3 w-16 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        </View>
      ))}
    </View>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────

function EmptyViewers() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('feed.story.noViews')}
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        {t('feed.story.noViewsDescription')}
      </Text>
    </View>
  );
}

// ── Viewer Row ──────────────────────────────────────────────────────────

const ViewerRow = memo(function ViewerRow({
  viewer,
  formatTimeAgo,
}: {
  viewer: { id: string; displayName: string; avatarUrl: string | null; viewedAt: string };
  formatTimeAgo: (date: Date | string) => string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Avatar name={viewer.displayName} imageUrl={viewer.avatarUrl} size="sm" />
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
          {viewer.displayName}
        </Text>
      </View>
      <Text className="text-xs text-gray-400 dark:text-neutral-500">
        {formatTimeAgo(viewer.viewedAt)}
      </Text>
    </View>
  );
});

// ── Screen ──────────────────────────────────────────────────────────────

export default function StoryViewersScreen() {
  const vm = useStoryViewersViewModel();
  const formatTimeAgo = useFormatTimeAgo();

  if (vm.isInitialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
        <ViewersSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <FlatList
        data={vm.viewers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ViewerRow viewer={item} formatTimeAgo={formatTimeAgo} />}
        ListEmptyComponent={<EmptyViewers />}
        refreshing={vm.refreshing}
        onRefresh={vm.refresh}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
