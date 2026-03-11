import { ResizeMode, Video } from 'expo-av';
import { memo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface PostMedia {
  id: string;
  url: string;
  mediaType: string;
  position: number;
}

interface ResolvedTag {
  id: string;
  taggedUser: { id: string; displayName: string; avatarUrl: string | null } | null;
  taggedDog: { id: string; name: string } | null;
}

interface PostCardProps {
  post: {
    id: string;
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    createdAt: Date | string;
    media: PostMedia[];
    author: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
    tags?: ResolvedTag[];
  };
  onLike: () => void;
  onPress: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Ora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}g`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export const PostCard = memo(function PostCard({
  post,
  onLike,
  onPress,
  onDelete,
  onReport,
}: PostCardProps) {
  const sortedMedia = [...post.media].sort((a, b) => a.position - b.position);
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View className="border-b border-gray-100 bg-white">
      {/* Author header */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable onPress={onPress} className="flex-1 flex-row items-center gap-3">
          <Avatar size="sm" imageUrl={post.author.avatarUrl} name={post.author.displayName} />
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">{post.author.displayName}</Text>
            <Text className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setMenuVisible(true)} className="px-1 py-2" hitSlop={8}>
          <Text className="text-base text-gray-400">...</Text>
        </Pressable>
      </View>

      {/* Context menu */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable onPress={() => setMenuVisible(false)} className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl bg-white pb-8 pt-2">
            <View className="mb-2 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>
            {onReport ? (
              <Pressable
                onPress={() => {
                  setMenuVisible(false);
                  onReport();
                }}
                className="px-6 py-4"
              >
                <Text className="text-base text-gray-900">Segnala</Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                onPress={() => {
                  setMenuVisible(false);
                  onDelete();
                }}
                className="px-6 py-4"
              >
                <Text className="text-base text-red-500">Elimina</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setMenuVisible(false)} className="px-6 py-4">
              <Text className="text-base text-gray-500">Annulla</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Media carousel */}
      {sortedMedia.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {sortedMedia.map((media) => (
            <Pressable key={media.id} onPress={onPress}>
              {media.mediaType === 'video' ? (
                <View>
                  <Video
                    source={{ uri: media.url }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    useNativeControls
                    className="h-72 w-screen"
                  />
                  <View className="absolute inset-0 items-center justify-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-black/50">
                      <Text className="ml-1 text-lg text-white">▶</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Image source={{ uri: media.url }} className="h-72 w-screen" resizeMode="cover" />
              )}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Media count indicator */}
      {sortedMedia.length > 1 ? (
        <View className="flex-row items-center justify-center gap-1 py-1">
          {sortedMedia.map((m) => (
            <View key={`dot-${m.id}`} className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          ))}
        </View>
      ) : null}

      {/* Tags */}
      {post.tags && post.tags.length > 0 ? (
        <View className="flex-row flex-wrap gap-1 px-4 pb-2">
          {post.tags.map((tag) => (
            <View key={tag.id} className="rounded-full bg-emerald-50 px-2 py-0.5">
              <Text className="text-xs text-emerald-800">
                {tag.taggedUser ? tag.taggedUser.displayName : null}
                {tag.taggedDog ? tag.taggedDog.name : null}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Caption */}
      {post.caption ? (
        <Text className="px-4 pb-2 text-sm text-gray-700" numberOfLines={3}>
          <Text className="font-semibold">{post.author.displayName} </Text>
          {post.caption}
        </Text>
      ) : null}

      {/* Actions */}
      <View className="flex-row items-center gap-4 px-4 pb-3">
        <Pressable onPress={onLike} className="flex-row items-center gap-1">
          <Text className="text-lg">{post.isLikedByMe ? '❤️' : '🤍'}</Text>
          <Text className="text-sm text-gray-600">{post.likesCount}</Text>
        </Pressable>
        <Pressable onPress={onPress} className="flex-row items-center gap-1">
          <Text className="text-lg">💬</Text>
          <Text className="text-sm text-gray-600">{post.commentsCount}</Text>
        </Pressable>
      </View>
    </View>
  );
});
