import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/trpc';

type HashtagPost = RouterOutput['feed']['searchByHashtag']['items'][number];

export type { HashtagPost };

export function useHashtagViewModel() {
  const { hashtag } = useLocalSearchParams<{ hashtag: string }>();
  const router = useRouter();
  const [items, setItems] = useState<HashtagPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(
    async (cursor?: string | null) => {
      if (!hashtag) return;
      const isRefresh = !cursor;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await api.feed.searchByHashtag.query({
          hashtag,
          cursor: cursor ?? undefined,
          limit: 20,
        });
        if (isRefresh) {
          setItems(data.items);
        } else {
          setItems((prev) => [...prev, ...data.items]);
        }
        setNextCursor(data.nextCursor);
      } catch (e) {
        logger.warn('HashtagScreen', 'Failed to search by hashtag', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hashtag],
  );

  useEffect(() => {
    void fetchPosts(null);
  }, [fetchPosts]);

  const refresh = useCallback(async () => {
    await fetchPosts(null);
  }, [fetchPosts]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    await fetchPosts(nextCursor);
  }, [nextCursor, loading, fetchPosts]);

  const navigateToPost = useCallback(
    (postId: string) => {
      router.push(`/(tabs)/discover/feed/${postId}`);
    },
    [router],
  );

  const isInitialLoad = loading && items.length === 0 && !refreshing;

  return {
    hashtag: hashtag ?? '',
    items,
    loading,
    refreshing,
    isInitialLoad,
    refresh,
    fetchMore,
    navigateToPost,
  };
}
