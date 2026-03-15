export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '@/components/PostCard';
import { StoriesRow } from '@/components/StoriesRow';
import type { FeedItem } from './index.view-model';
import { useFeedViewModel } from './index.view-model';

// ── Loading Skeleton ──────────────────────────────────────────────────────

function FeedSkeleton() {
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

function EmptyFeed() {
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-5xl">📷</Text>
      <Text className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        Nessun post ancora
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        Inizia a seguire altri proprietari o pubblica il tuo primo post!
      </Text>
    </View>
  );
}

// ── FAB ────────────────────────────────────────────────────────────────────

function CreateFAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-emerald-800 shadow-lg"
    >
      <Text className="text-2xl text-white">+</Text>
    </Pressable>
  );
}

// ── Feed Item Renderer ────────────────────────────────────────────────────

const FeedItemRow = memo(function FeedItemRow({
  item,
  onLike,
  onPress,
  onDelete,
  onReport,
}: {
  item: FeedItem;
  onLike: (postId: string) => void;
  onPress: (postId: string) => void;
  onDelete: (postId: string) => void;
  onReport: (postId: string) => void;
}) {
  return (
    <PostCard
      post={item}
      onLike={() => onLike(item.id)}
      onPress={() => onPress(item.id)}
      onDelete={() => onDelete(item.id)}
      onReport={() => onReport(item.id)}
    />
  );
});

// ── Main Screen ────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const vm = useFeedViewModel();

  if (vm.isInitialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
        <View className="border-b border-gray-100 dark:border-[#38383A] px-4 pb-3 pt-2">
          <Text className="text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">Feed</Text>
        </View>
        <FeedSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 pb-3 pt-2">
        <Text className="text-xl font-bold text-gray-900">Feed</Text>
      </View>

      {/* New posts banner */}
      {vm.hasNewPosts ? (
        <Pressable
          onPress={vm.refresh}
          className="items-center border-b border-emerald-100 bg-emerald-50 py-2"
        >
          <Text className="text-sm font-medium text-emerald-800">Nuovi post disponibili</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={vm.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <StoriesRow
            groups={vm.storyGroups}
            onPress={vm.navigateToStoryViewer}
            onCreateStory={vm.navigateToStoryCreate}
          />
        }
        ListEmptyComponent={<EmptyFeed />}
        renderItem={({ item }) => (
          <FeedItemRow
            item={item}
            onLike={vm.handleLike}
            onPress={vm.navigateToPost}
            onDelete={vm.handleDelete}
            onReport={vm.navigateToReport}
          />
        )}
        refreshing={vm.refreshing}
        onRefresh={vm.refresh}
        onEndReached={vm.fetchMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <CreateFAB onPress={vm.navigateToCreate} />
    </SafeAreaView>
  );
}
