import type { RouterOutput } from '@pawmeet/api-client';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StoryViewer } from '@/components/StoryViewer';
import { useFeed } from '@/hooks/useFeed';
import { useAuthStore } from '@/stores/auth';

type StoryGroup = RouterOutput['feed']['stories']['groups'][number];

export default function StoryViewerModal() {
  const { authorId } = useLocalSearchParams<{ authorId: string }>();
  const router = useRouter();
  const { storyGroups, fetchStories, viewStory } = useFeed();
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const found = storyGroups.find((g) => g.author.id === authorId);
    if (found) {
      setGroup(found);
    } else {
      void fetchStories().then((groups) => {
        const g = groups.find((g) => g.author.id === authorId);
        if (g) setGroup(g);
      });
    }
  }, [authorId, storyGroups, fetchStories]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleView = useCallback(
    (storyId: string) => {
      void viewStory(storyId);
    },
    [viewStory],
  );

  const handleViewersPress = useCallback(
    (storyId: string) => {
      router.push(`/(modals)/story-viewers?storyId=${storyId}`);
    },
    [router],
  );

  const isOwnStory = Boolean(currentUserId && authorId === currentUserId);

  if (!group) return <View className="flex-1 bg-black" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <StoryViewer
        stories={group.stories}
        author={group.author}
        isOwn={isOwnStory}
        onView={handleView}
        onClose={handleClose}
        onViewersPress={handleViewersPress}
      />
    </>
  );
}
