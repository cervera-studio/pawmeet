import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/trpc';

type StoryViewer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
};

export function useStoryViewersViewModel() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!storyId) return;

    try {
      const data = await api.feed.storyViewers.query({ storyId });
      setViewers(data as StoryViewer[]);
    } catch (e) {
      logger.warn('StoryViewersScreen', 'Failed to fetch story viewers', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storyId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
  }, [fetch]);

  const isInitialLoad = loading && viewers.length === 0 && !refreshing;

  return {
    viewers,
    loading,
    refreshing,
    isInitialLoad,
    refresh,
  };
}
