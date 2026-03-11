import type { RouterOutput } from '@dogwalk/api-client';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';

type PostDetail = RouterOutput['feed']['postDetail']['post'];
type CommentWithAuthor = RouterOutput['feed']['getComments']['comments'][number];

export type { CommentWithAuthor, PostDetail };

export function usePostDetailViewModel() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { likePost, fetchComments, createComment, reportContent } = useFeed();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const { api } = await import('@/lib/trpc');
      const data = await api.feed.postDetail.query({ postId });
      setPost(data.post);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const loadComments = useCallback(
    async (cursor?: string | null) => {
      if (!postId) return;
      const data = await fetchComments(postId, cursor);
      if (data) {
        if (!cursor) {
          setComments(data.comments);
        } else {
          setComments((prev) => [...prev, ...data.comments]);
        }
        setCommentsCursor(data.nextCursor);
      }
    },
    [postId, fetchComments],
  );

  useEffect(() => {
    void fetchPost();
    void loadComments(null);
  }, [fetchPost, loadComments]);

  const handleLike = useCallback(async () => {
    if (!postId || !post) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await likePost(postId);
    if (result) {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLikedByMe: result.liked,
              likesCount: result.liked ? prev.likesCount + 1 : prev.likesCount - 1,
            }
          : prev,
      );
    }
  }, [postId, post, likePost]);

  const handleSubmitComment = useCallback(async () => {
    if (!postId || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const result = await createComment(postId, commentText.trim());
      if (result) {
        setCommentText('');
        void loadComments(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSubmitting(false);
    }
  }, [postId, commentText, createComment, loadComments]);

  const handleReport = useCallback(
    async (reason: string) => {
      if (!postId) return;
      const success = await reportContent('post', postId, reason);
      if (success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [postId, reportContent],
  );

  const loadMoreComments = useCallback(async () => {
    if (commentsCursor) {
      await loadComments(commentsCursor);
    }
  }, [commentsCursor, loadComments]);

  return {
    post,
    comments,
    loading,
    commentText,
    setCommentText,
    submitting,
    commentsCursor,
    handleLike,
    handleSubmitComment,
    handleReport,
    loadMoreComments,
    goBack: () => router.back(),
  };
}
