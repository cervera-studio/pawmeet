export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Stack } from 'expo-router';
import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInput as TextInputType } from 'react-native';
import {
  ActivityIndicator,
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
import type { CommentWithAuthor } from './comments.view-model';
import { useCommentsViewModel } from './comments.view-model';

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
  isOwn,
  onReply,
  onDelete,
  onReport,
}: {
  comment: CommentWithAuthor;
  isOwn: boolean;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
}) {
  const { t } = useTranslation();
  const isReply = Boolean(comment.parentId);

  return (
    <Pressable
      onLongPress={() => {
        if (isOwn) {
          onDelete(comment.id);
        }
      }}
      delayLongPress={500}
    >
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
            {isReply ? null : (
              <>
                <Pressable onPress={() => onReply(comment.id, comment.author.displayName)}>
                  <Text className="text-xs font-medium text-emerald-700">{t('common.reply')}</Text>
                </Pressable>
                {isOwn ? (
                  <Pressable onPress={() => onDelete(comment.id)}>
                    <Text className="text-xs font-medium text-red-500">{t('common.delete')}</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => onReport(comment.id)}>
                    <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                      {t('feed.comments.report')}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

// ── Empty State ────────────────────────────────────────────────────────

function EmptyComments() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-5xl">💬</Text>
      <Text className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('feed.comments.noComments')}
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        {t('feed.comments.noCommentsDescription')}
      </Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────

export default function CommentsScreen() {
  const { t } = useTranslation();
  const vm = useCommentsViewModel();
  const inputRef = useRef<TextInputType>(null);

  const handleReply = (commentId: string, authorName: string) => {
    vm.handleReply(commentId, authorName);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('feed.comments.title'),
          headerBackTitle: t('feed.backButton'),
        }}
      />

      {vm.loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={90}
        >
          <FlatList
            data={vm.comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                isOwn={item.author.id === vm.currentUserId}
                onReply={handleReply}
                onDelete={vm.handleDeleteComment}
                onReport={vm.navigateToCommentReport}
              />
            )}
            onEndReached={vm.loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={<EmptyComments />}
            contentContainerStyle={{ paddingBottom: 8 }}
          />

          {/* Reply banner */}
          {vm.replyingTo ? (
            <View className="flex-row items-center justify-between border-t border-gray-100 dark:border-[#38383A] bg-gray-50 dark:bg-[#2C2C2E] px-4 py-2">
              <Text className="text-xs text-gray-500 dark:text-neutral-500">
                {t('feed.comments.replyTo')}{' '}
                <Text className="font-semibold">{vm.replyingTo.authorName}</Text>
              </Text>
              <Pressable onPress={vm.cancelReply}>
                <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Comment Input */}
          <View className="flex-row items-center gap-2 border-t border-gray-100 dark:border-[#38383A] px-4 py-2">
            <TextInput
              ref={inputRef}
              className="flex-1 rounded-full bg-gray-100 dark:bg-[#38383A] px-4 py-2 text-sm text-gray-900 dark:text-[#F5F5F7]"
              placeholder={
                vm.replyingTo
                  ? t('feed.comments.replyPlaceholder')
                  : t('feed.comments.writePlaceholder')
              }
              placeholderTextColor="#9CA3AF"
              value={vm.commentText}
              onChangeText={vm.setCommentText}
              maxLength={500}
            />
            <Pressable
              onPress={vm.handleSubmitComment}
              disabled={vm.submitting || !vm.commentText.trim()}
              className={`rounded-full px-4 py-2 ${
                vm.submitting || !vm.commentText.trim()
                  ? 'bg-gray-300 dark:bg-[#48484A]'
                  : 'bg-emerald-800'
              }`}
            >
              <Text className="text-sm font-semibold text-white">
                {vm.submitting ? '...' : t('feed.comments.sendButton')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
