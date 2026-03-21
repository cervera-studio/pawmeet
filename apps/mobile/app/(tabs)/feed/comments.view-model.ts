import type { RouterOutput } from '@pawmeet/api-client';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useFeed } from '@/hooks/useFeed';
import { isValidUUID } from '@/lib/deep-link-validation';
import { useAuthStore } from '@/stores/auth';

type CommentWithAuthor = RouterOutput['feed']['getComments']['comments'][number];

export interface ReplyTarget {
  commentId: string;
  authorName: string;
}

export type { CommentWithAuthor };

export function useCommentsViewModel() {
  const { postId: rawPostId } = useLocalSearchParams<{ postId: string }>();
  const postId = rawPostId && isValidUUID(rawPostId) ? rawPostId : undefined;
  const router = useRouter();
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { fetchComments, createComment, deleteComment, reportContent } = useFeed();

  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

  const loadComments = useCallback(
    async (nextCursor?: string | null) => {
      if (!postId) return;
      const isRefresh = !nextCursor;
      if (isRefresh) setLoading(true);
      try {
        const data = await fetchComments(postId, nextCursor);
        if (data) {
          if (nextCursor) {
            setComments((prev) => [...prev, ...data.comments]);
          } else {
            setComments(data.comments);
          }
          setCursor(data.nextCursor);
        }
      } finally {
        setLoading(false);
      }
    },
    [postId, fetchComments],
  );

  useEffect(() => {
    void loadComments(null);
  }, [loadComments]);

  const loadMore = useCallback(async () => {
    if (cursor) {
      await loadComments(cursor);
    }
  }, [cursor, loadComments]);

  const handleSubmitComment = useCallback(async () => {
    if (!(postId && commentText.trim())) return;
    setSubmitting(true);
    try {
      const parentId = replyingTo?.commentId ?? null;
      const result = await createComment(postId, commentText.trim(), parentId);
      if (result) {
        setCommentText('');
        setReplyingTo(null);
        void loadComments(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSubmitting(false);
    }
  }, [postId, commentText, replyingTo, createComment, loadComments]);

  const handleReply = useCallback((commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      Alert.alert(t('feed.comments.deleteTitle'), t('feed.comments.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteComment(commentId);
            if (success) {
              setComments((prev) => prev.filter((c) => c.id !== commentId));
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]);
    },
    [deleteComment, t],
  );

  const navigateToCommentReport = useCallback(
    (commentId: string) => {
      router.push(`/(modals)/report?contentType=comment&contentId=${commentId}`);
    },
    [router],
  );

  // Organize into threads: parents first, replies grouped below
  const threadedComments = useMemo(() => {
    const parents = comments.filter((c) => !c.parentId);
    const repliesByParent = new Map<string, CommentWithAuthor[]>();
    for (const c of comments) {
      if (c.parentId) {
        const list = repliesByParent.get(c.parentId) ?? [];
        list.push(c);
        repliesByParent.set(c.parentId, list);
      }
    }

    const result: CommentWithAuthor[] = [];
    for (const parent of parents) {
      result.push(parent);
      const replies = repliesByParent.get(parent.id);
      if (replies) {
        result.push(...replies);
      }
    }

    return result;
  }, [comments]);

  return {
    postId,
    comments: threadedComments,
    loading,
    commentText,
    setCommentText,
    submitting,
    replyingTo,
    currentUserId,
    handleSubmitComment,
    handleReply,
    cancelReply,
    handleDeleteComment,
    navigateToCommentReport,
    loadMore,
  };
}
