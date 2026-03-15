export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Stack } from 'expo-router';
import { memo, useRef } from 'react';
import type { TextInput as TextInputType } from 'react-native';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import type { CommentWithAuthor } from './[postId].view-model';
import { usePostDetailViewModel } from './[postId].view-model';

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Comment Row ─────────────────────────────────────────────────────────

const CommentRow = memo(function CommentRow({
  comment,
  onReply,
  onReport,
}: {
  comment: CommentWithAuthor;
  onReply: (commentId: string, authorName: string) => void;
  onReport: (commentId: string) => void;
}) {
  const isReply = Boolean(comment.parentId);
  return (
    <View
      className={`flex-row gap-3 px-4 py-3 ${isReply ? 'ml-10 border-l-2 border-gray-100 dark:border-[#38383A] pl-4' : ''}`}
    >
      <Avatar size="sm" imageUrl={comment.author.avatarUrl} name={comment.author.displayName} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
          {comment.author.displayName}
        </Text>
        <Text className="text-sm text-gray-700 dark:text-[#D1D1D6]">{comment.content}</Text>
        <View className="mt-1 flex-row items-center gap-3">
          <Text className="text-xs text-gray-400 dark:text-neutral-500">
            {formatDate(comment.createdAt)}
          </Text>
          {!isReply ? (
            <>
              <Pressable onPress={() => onReply(comment.id, comment.author.displayName)}>
                <Text className="text-xs font-medium text-emerald-700">Rispondi</Text>
              </Pressable>
              <Pressable onPress={() => onReport(comment.id)}>
                <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  Segnala
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
});

// ── Loading State ──────────────────────────────────────────────────────

function PostDetailSkeleton() {
  return (
    <View className="p-4">
      <View className="mb-4 h-64 rounded-xl bg-gray-100 dark:bg-[#38383A]" />
      <View className="mb-2 h-4 w-3/4 rounded bg-gray-100 dark:bg-[#38383A]" />
      <View className="h-4 w-1/2 rounded bg-gray-100 dark:bg-[#38383A]" />
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────

export default function PostDetailScreen() {
  const vm = usePostDetailViewModel();
  const inputRef = useRef<TextInputType>(null);

  const handleReply = (commentId: string, authorName: string) => {
    vm.handleReply(commentId, authorName);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Post',
          headerBackTitle: 'Feed',
        }}
      />

      {vm.loading || !vm.post ? (
        <PostDetailSkeleton />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={90}
        >
          <FlatList
            data={vm.comments}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View className="border-b border-gray-100 dark:border-[#38383A]">
                {/* Author */}
                <View className="flex-row items-center gap-3 px-4 py-3">
                  <Avatar
                    size="sm"
                    imageUrl={vm.post.author.avatarUrl}
                    name={vm.post.author.displayName}
                  />
                  <Text className="font-semibold text-gray-900 dark:text-[#F5F5F7]">
                    {vm.post.author.displayName}
                  </Text>
                </View>

                {/* Caption */}
                {vm.post.caption ? (
                  <Text className="px-4 pb-3 text-sm text-gray-700 dark:text-[#D1D1D6]">
                    {vm.post.caption}
                  </Text>
                ) : null}

                {/* Actions */}
                <View className="flex-row items-center gap-4 border-t border-gray-50 dark:border-[#38383A] px-4 py-2">
                  <Pressable onPress={vm.handleLike} className="flex-row items-center gap-1">
                    <Text className="text-lg">{vm.post.isLikedByMe ? '❤️' : '🤍'}</Text>
                    <Text className="text-sm text-gray-600 dark:text-[#D1D1D6]">
                      {vm.post.likesCount}
                    </Text>
                  </Pressable>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-lg">💬</Text>
                    <Text className="text-sm text-gray-600 dark:text-[#D1D1D6]">
                      {vm.post.commentsCount}
                    </Text>
                  </View>
                </View>

                {/* Comments header */}
                <View className="border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
                  <Text className="text-sm font-semibold text-gray-500 dark:text-neutral-500">
                    Commenti
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                onReply={handleReply}
                onReport={vm.navigateToCommentReport}
              />
            )}
            onEndReached={vm.loadMoreComments}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <Text className="px-4 py-8 text-center text-sm text-gray-400 dark:text-neutral-500">
                Nessun commento ancora
              </Text>
            }
          />

          {/* Reply banner */}
          {vm.replyingTo ? (
            <View className="flex-row items-center justify-between border-t border-gray-100 dark:border-[#38383A] bg-gray-50 dark:bg-[#2C2C2E] px-4 py-2">
              <Text className="text-xs text-gray-500 dark:text-neutral-500">
                Rispondi a <Text className="font-semibold">{vm.replyingTo.authorName}</Text>
              </Text>
              <Pressable onPress={vm.cancelReply}>
                <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  Annulla
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Comment Input */}
          <View className="flex-row items-center gap-2 border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
            <TextInput
              ref={inputRef}
              className="flex-1 rounded-full bg-gray-100 dark:bg-[#38383A] px-4 py-2 text-sm"
              placeholder={vm.replyingTo ? 'Scrivi una risposta...' : 'Scrivi un commento...'}
              value={vm.commentText}
              onChangeText={vm.setCommentText}
              maxLength={500}
            />
            <Pressable
              onPress={vm.handleSubmitComment}
              disabled={vm.submitting || !vm.commentText.trim()}
              className="rounded-full bg-emerald-800 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">
                {vm.submitting ? '...' : 'Invia'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
