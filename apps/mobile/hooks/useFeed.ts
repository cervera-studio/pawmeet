import type { RouterOutput } from '@pawmeet/api-client';
import type { ContentReportReason } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from '@/repositories/container';
import { FEED_REPOSITORY } from '@/repositories/tokens';

type FeedItem = RouterOutput['feed']['timeline']['items'][number];
type FeedPage = RouterOutput['feed']['timeline'];
type PostDetail = RouterOutput['feed']['postDetail']['post'];
type CommentsPage = RouterOutput['feed']['getComments'];
type StoryGroup = RouterOutput['feed']['stories']['groups'][number];

export type { CommentsPage, FeedItem, FeedPage, PostDetail, StoryGroup };

const feedRepo = container.resolve(FEED_REPOSITORY);

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
      const data = await feedRepo.timeline(cursor ?? undefined, 20);
      if (isRefresh) {
        setItems(data.items as FeedItem[]);
      } else {
        setItems((prev) => [...prev, ...(data.items as FeedItem[])]);
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

  const fetchStories = useCallback(async (): Promise<StoryGroup[]> => {
    try {
      const data = await feedRepo.stories();
      const groups = data.groups as StoryGroup[];
      setStoryGroups(groups);
      return groups;
    } catch (e) {
      logger.warn('useFeed', 'Failed to fetch stories', e);
      return [];
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      const result = await feedRepo.like(postId);
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
        const result = await feedRepo.createComment(postId, content, parentId ?? undefined);
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

  const fetchComments = useCallback(
    async (postId: string, cursor?: string | null): Promise<CommentsPage | null> => {
      try {
        return (await feedRepo.getComments(postId, cursor ?? undefined, 20)) as CommentsPage;
      } catch (e) {
        logger.warn('useFeed', 'Failed to fetch comments', e);
        return null;
      }
    },
    [],
  );

  const deletePost = useCallback(async (postId: string) => {
    try {
      await feedRepo.deletePost(postId);
      setItems((prev) => prev.filter((item) => item.id !== postId));
      return true;
    } catch (e) {
      logger.warn('useFeed', 'Failed to delete post', e);
      return false;
    }
  }, []);

  const viewStory = useCallback(async (storyId: string) => {
    try {
      await feedRepo.viewStory(storyId);
    } catch (e) {
      logger.warn('useFeed', 'Failed to view story', e);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await feedRepo.deleteComment(commentId);
      return true;
    } catch (e) {
      logger.warn('useFeed', 'Failed to delete comment', e);
      return false;
    }
  }, []);

  const addReaction = useCallback(async (postId: string, emoji: string) => {
    try {
      await feedRepo.addReaction('post', postId, emoji);
      return true;
    } catch (e) {
      logger.warn('useFeed', 'Failed to add reaction', e);
      return false;
    }
  }, []);

  const removeReaction = useCallback(async (postId: string, emoji: string) => {
    try {
      await feedRepo.removeReaction('post', postId, emoji);
      return true;
    } catch (e) {
      logger.warn('useFeed', 'Failed to remove reaction', e);
      return false;
    }
  }, []);

  const reportContent = useCallback(
    async (
      contentType: 'post' | 'comment' | 'story',
      contentId: string,
      reason: ContentReportReason,
    ) => {
      try {
        await feedRepo.reportContent(contentType, contentId, reason);
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
    deleteComment,
    deletePost,
    viewStory,
    reportContent,
    addReaction,
    removeReaction,
  };
}
