export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AlbumMedia } from './_vm/walk-album.view-model';
import { useWalkAlbumViewModel } from './_vm/walk-album.view-model';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 3;
const TILE_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - TILE_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

// ── Grid Tile ─────────────────────────────────────────────────────────

const GridTile = memo(function GridTile({
  item,
  onPress,
}: {
  item: AlbumMedia;
  onPress: (item: AlbumMedia) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item)} className="mb-[2px]">
      <Image
        source={{ uri: item.thumbnailUrl ?? item.url }}
        style={{ width: TILE_SIZE, height: TILE_SIZE }}
        resizeMode="cover"
      />
    </Pressable>
  );
});

// ── Loading Skeleton ──────────────────────────────────────────────────

function AlbumSkeleton() {
  return (
    <View className="p-4">
      <View className="mb-4 h-6 w-2/3 rounded bg-gray-100 dark:bg-[#38383A]" />
      <View className="mb-2 h-4 w-1/3 rounded bg-gray-100 dark:bg-[#38383A]" />
      <View className="mt-4 flex-row flex-wrap gap-[2px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={`skeleton-${i}`}
            style={{ width: TILE_SIZE, height: TILE_SIZE }}
            className="bg-gray-100 dark:bg-[#38383A]"
          />
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────

export default function WalkAlbumScreen() {
  const vm = useWalkAlbumViewModel();
  const router = useRouter();

  const handleMediaPress = (item: AlbumMedia) => {
    router.push(
      `/(modals)/media-viewer?url=${encodeURIComponent(item.url)}&mediaType=${item.mediaType}`,
    );
  };

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
        <AlbumSkeleton />
      </SafeAreaView>
    );
  }

  if (!vm.album || vm.media.length === 0) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]"
        edges={['bottom']}
      >
        <Text className="text-base text-gray-400 dark:text-neutral-500">
          Nessuna foto in questo album
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <FlatList
        data={vm.media}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={{ gap: TILE_GAP }}
        ListHeaderComponent={
          <View className="px-4 py-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
              {vm.album.album.title ?? 'Album passeggiata'}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
              {vm.album.posts.length} {vm.album.posts.length === 1 ? 'post' : 'post'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <GridTile item={item} onPress={handleMediaPress} />}
        ListEmptyComponent={
          <Text className="px-4 py-8 text-center text-sm text-gray-400 dark:text-neutral-500">
            Nessuna foto in questo album
          </Text>
        }
      />
    </SafeAreaView>
  );
}
