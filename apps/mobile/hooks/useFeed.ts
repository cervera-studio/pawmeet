import type { RouterOutput } from '@pawmeet/api-client';
import type { ContentReportReason } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type FeedItem = RouterOutput['feed']['timeline']['items'][number];
type FeedPage = RouterOutput['feed']['timeline'];
type PostDetail = RouterOutput['feed']['postDetail']['post'];
type CommentsPage = RouterOutput['feed']['getComments'];
type StoryGroup = RouterOutput['feed']['stories']['groups'][number];

export type { CommentsPage, FeedItem, FeedPage, PostDetail, StoryGroup };

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);

  const fetchTimeline = useCallback(async (cursor?: string | null) => {
    const isRefresh = !cursor;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.feed.timeline.query({
        cursor: cursor ?? undefined,
        limit: 20,
      });
      if (isRefresh) {
        setItems(data.items);
      } else {
        setItems((prev) => [...prev, ...data.items]);
      }
      setNextCursor(data.nextCursor);
      return data;
    } catch (e) {
      logger.warn('useFeed', 'Failed to fetch timeline', e);
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    await fetchTimeline(nextCursor);
  }, [nextCursor, loading, fetchTimeline]);

  const refresh = useCallback(async () => {
    await fetchTimeline(null);
  }, [fetchTimeline]);

  const fetchStories = useCallback(async () => {
    try {
      const data = await api.feed.stories.query();
      setStoryGroups(data.groups);
      return data.groups;
    } catch (e) {
      logger.warn('useFeed', 'Failed to fetch stories', e);
      return [];
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      const result = await api.feed.like.mutate({ postId });
      setItems((prev) =>
        prev.map((item) =>
          item.id === postId
            ? {
                ...item,
                isLikedByMe: result.liked,
                likesCount: result.liked ? item.likesCount + 1 : item.likesCount - 1,
              }
            : item,
        ),
      );
      return result;
    } catch (e) {
      logger.warn('useFeed', 'Failed to toggle like', e);
      return null;
    }
  }, []);

  const createComment = useCallback(
    async (postId: string, content: string, parentId?: string | null) => {
      try {
        const result = await api.feed.createComment.mutate({
          postId,
          content,
          parentId: parentId ?? undefined,
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === postId ? { ...item, commentsCount: item.commentsCount + 1 } : item,
          ),
        );
        return result;
      } catch (e) {
        logger.warn('useFeed', 'Failed to create comment', e);
        return null;
      }
    },
    [],
  );

  const fetchComments = useCallback(async (postId: string, cursor?: string | null) => {
    try {
      return await api.feed.getComments.query({
        postId,
        cursor: cursor ?? undefined,
        limit: 20,
      });
    } catch (e) {
      logger.warn('useFeed', 'Failed to fetch comments', e);
      return null;
    }
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    try {
      await api.feed.deletePost.mutate({ postId });
      setItems((prev) => prev.filter((item) => item.id !== postId));
      return true;
    } catch (e) {
      logger.warn('useFeed', 'Failed to delete post', e);
      return false;
    }
  }, []);

  const viewStory = useCallback(async (storyId: string) => {
    try {
      await api.feed.viewStory.mutate({ storyId });
    } catch (e) {
      logger.warn('useFeed', 'Failed to view story', e);
    }
  }, []);

  const reportContent = useCallback(
    async (
      contentType: 'post' | 'comment' | 'story',
      contentId: string,
      reason: ContentReportReason,
    ) => {
      try {
        await api.feed.reportContent.mutate({
          contentType,
          contentId,
          reason,
        });
        return true;
      } catch (e) {
        logger.warn('useFeed', 'Failed to report content', e);
        return false;
      }
    },
    [],
  );

  return {
    items,
    nextCursor,
    loading,
    refreshing,
    storyGroups,
    fetchTimeline,
    fetchMore,
    refresh,
    fetchStories,
    likePost,
    createComment,
    fetchComments,
    deletePost,
    viewStory,
    reportContent,
  };
}
