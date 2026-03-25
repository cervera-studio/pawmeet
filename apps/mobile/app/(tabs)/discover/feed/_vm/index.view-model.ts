import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import type { FeedItem, StoryGroup } from '@/hooks/useFeed';
import { useFeed } from '@/hooks/useFeed';
import { useFeedRealtime } from '@/hooks/useFeedRealtime';
import { useFeedStore } from '@/stores/feed';

export type { FeedItem, StoryGroup };

export function useFeedViewModel() {
  const router = useRouter();
  const {
    items,
    loading,
    refreshing,
    storyGroups,
    refresh,
    fetchMore,
    fetchStories,
    likePost,
    deletePost,
  } = useFeed();

  const hasNewPosts = useFeedStore((s) => s.hasNewPosts);
  const setHasNewPosts = useFeedStore((s) => s.setHasNewPosts);

  const realtimeCallbacks = useMemo(
    () => ({
      onNewPost: () => {
        setHasNewPosts(true);
      },
      onNewStory: () => {
        void fetchStories();
      },
    }),
    [fetchStories, setHasNewPosts],
  );

  useFeedRealtime(realtimeCallbacks);

  useEffect(() => {
    void refresh();
    void fetchStories();
  }, [refresh, fetchStories]);

  const handleRefreshWithReset = useCallback(async () => {
    setHasNewPosts(false);
    await refresh();
  }, [refresh, setHasNewPosts]);

  const handleLike = useCallback(
    async (postId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await likePost(postId);
    },
    [likePost],
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      Alert.alert('Elimina post', 'Sei sicuro di voler eliminare questo post?', [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePost(postId);
            if (success) {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]);
    },
    [deletePost],
  );

  const navigateToPost = (postId: string) => {
    router.push(`/(tabs)/discover/feed/${postId}`);
  };

  const navigateToReport = (postId: string) => {
    router.push(`/(modals)/report?contentType=post&contentId=${postId}`);
  };

  const navigateToCreate = () => {
    router.push('/(tabs)/discover/feed/create');
  };

  const navigateToStoryViewer = (authorId: string) => {
    router.push(`/(modals)/story-viewer?authorId=${authorId}`);
  };

  const navigateToStoryCreate = () => {
    router.push('/(modals)/story-create');
  };

  const isInitialLoad = loading && items.length === 0;

  return {
    items,
    loading,
    refreshing,
    storyGroups,
    isInitialLoad,
    hasNewPosts,
    refresh: handleRefreshWithReset,
    fetchMore,
    handleLike,
    handleDelete,
    navigateToPost,
    navigateToCreate,
    navigateToStoryViewer,
    navigateToStoryCreate,
    navigateToReport,
  };
}
