export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Stack } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '@/components/PostCard';
import type { HashtagPost } from './hashtag.view-model';
import { useHashtagViewModel } from './hashtag.view-model';

// ── Loading Skeleton ──────────────────────────────────────────────────────

function HashtagSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="mb-4 rounded-xl bg-gray-100 dark:bg-[#38383A] p-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-full bg-gray-200 dark:bg-[#48484A]" />
            <View className="h-4 w-24 rounded bg-gray-200 dark:bg-[#48484A]" />
          </View>
          <View className="mb-2 h-48 rounded-lg bg-gray-200 dark:bg-[#48484A]" />
          <View className="h-4 w-full rounded bg-gray-200 dark:bg-[#48484A]" />
        </View>
      ))}
    </View>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyHashtag({ hashtag }: { hashtag: string }) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-5xl">#</Text>
      <Text className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('feed.hashtag.noPosts')}
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        {t('feed.hashtag.noPostsDescription', { hashtag })}
      </Text>
    </View>
  );
}

// ── Post Row ──────────────────────────────────────────────────────────────

const HashtagPostRow = memo(function HashtagPostRow({
  item,
  onPress,
}: {
  item: HashtagPost;
  onPress: (postId: string) => void;
}) {
  return <PostCard post={item} onLike={() => {}} onPress={() => onPress(item.id)} />;
});

// ── Screen ────────────────────────────────────────────────────────────────

export default function HashtagScreen() {
  const { t } = useTranslation();
  const vm = useHashtagViewModel();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('feed.hashtag.title', { hashtag: vm.hashtag }),
          headerBackTitle: t('feed.backButton'),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white dark:bg-[#1C1C1E]">
        {vm.isInitialLoad ? (
          <HashtagSkeleton />
        ) : (
          <FlatList
            data={vm.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HashtagPostRow item={item} onPress={vm.navigateToPost} />}
            ListEmptyComponent={<EmptyHashtag hashtag={vm.hashtag} />}
            refreshing={vm.refreshing}
            onRefresh={vm.refresh}
            onEndReached={vm.fetchMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </SafeAreaView>
    </>
  );
}
