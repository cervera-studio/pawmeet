import type { RouterOutput } from '@pawmeet/api-client';
import type { ContentReportReason } from '@pawmeet/types';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFeed } from '@/hooks/useFeed';

type PostDetail = RouterOutput['feed']['postDetail']['post'];
type CommentWithAuthor = RouterOutput['feed']['getComments']['comments'][number];

export interface ReplyTarget {
  commentId: string;
  authorName: string;
}

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
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);

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
        if (cursor) {
          setComments((prev) => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
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
    if (!(postId && post)) return;
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

  // Organize comments into threads: parent comments first, replies grouped under their parent
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

  const navigateToCommentReport = useCallback(
    (commentId: string) => {
      router.push(`/(modals)/report?contentType=comment&contentId=${commentId}`);
    },
    [router],
  );

  const handleReport = useCallback(
    async (reason: ContentReportReason) => {
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
    comments: threadedComments,
    loading,
    commentText,
    setCommentText,
    submitting,
    commentsCursor,
    replyingTo,
    handleLike,
    handleSubmitComment,
    handleReport,
    navigateToCommentReport,
    handleReply,
    cancelReply,
    loadMoreComments,
    goBack: () => router.back(),
  };
}
