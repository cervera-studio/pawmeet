import { Stack } from 'expo-router';
import { memo } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalkAlbumViewModel } from './_[walkId].view-model';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

interface AlbumMedia {
  id: string;
  url: string;
  mediaType: string;
}

const AlbumTile = memo(function AlbumTile({ media }: { media: AlbumMedia }) {
  return (
    <View style={{ width: TILE_SIZE, height: TILE_SIZE, margin: GAP / 2 }}>
      <Image source={{ uri: media.url }} className="h-full w-full" resizeMode="cover" />
      {media.mediaType.startsWith('video') ? (
        <View className="absolute bottom-1 right-1 rounded bg-black/50 px-1">
          <Text className="text-xs text-white">▶</Text>
        </View>
      ) : null}
    </View>
  );
});

function AlbumEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">📷</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        Nessuna foto nell'album
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-neutral-500 px-8">
        Le foto della passeggiata appariranno qui
      </Text>
    </View>
  );
}

export default function WalkAlbumScreen() {
  const vm = useWalkAlbumViewModel();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          title: vm.album?.album?.title ?? 'Album',
          headerShown: true,
        }}
      />

      {vm.loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#065F46" />
        </View>
      ) : null}
      {!vm.loading && (!vm.album?.posts || vm.album.posts.length === 0) ? (
        <AlbumEmptyState />
      ) : null}
      {!vm.loading && vm.album?.posts && vm.album.posts.length > 0 ? (
        <FlatList
          data={vm.album.posts.flatMap((post) =>
            post.media.map((m) => ({ ...m, postId: post.id })),
          )}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={{ padding: GAP / 2 }}
          renderItem={({ item }) => <AlbumTile media={item} />}
          onRefresh={vm.refresh}
          refreshing={vm.loading}
        />
      ) : null}

      {vm.album?.album ? (
        <View className="border-t border-gray-100 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-4 py-3">
          <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
            {vm.album.posts.length} post ·{' '}
            {vm.album.posts.reduce((acc, p) => acc + p.media.length, 0)} foto
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
