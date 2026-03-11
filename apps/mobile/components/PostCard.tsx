import { memo } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface PostMedia {
  id: string;
  url: string;
  mediaType: string;
  position: number;
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
  };
  onLike: () => void;
  onPress: () => void;
  onDelete?: () => void;
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

export const PostCard = memo(function PostCard({ post, onLike, onPress, onDelete }: PostCardProps) {
  const sortedMedia = [...post.media].sort((a, b) => a.position - b.position);

  return (
    <View className="border-b border-gray-100 bg-white">
      {/* Author header */}
      <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-3">
        <Avatar size="sm" imageUrl={post.author.avatarUrl} name={post.author.displayName} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{post.author.displayName}</Text>
          <Text className="text-xs text-gray-400">{formatTimeAgo(post.createdAt)}</Text>
        </View>
      </Pressable>

      {/* Media carousel */}
      {sortedMedia.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {sortedMedia.map((media) => (
            <Pressable key={media.id} onPress={onPress}>
              <Image source={{ uri: media.url }} className="h-72 w-screen" resizeMode="cover" />
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
