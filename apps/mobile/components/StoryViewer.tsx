import type { AVPlaybackStatus } from 'expo-av';
import { ResizeMode, Video } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: Date | string;
}

interface StoryViewerProps {
  stories: Story[];
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  onView: (storyId: string) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Adesso';
  return `${diffHours}h fa`;
}

export function StoryViewer({ stories, author, onView, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<Video>(null);

  const currentStory = stories[currentIndex];

  const startProgress = useCallback(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      }
    });
  }, [currentIndex, stories.length, progressAnim, onClose]);

  useEffect(() => {
    startProgress();
    if (currentStory) {
      onView(currentStory.id);
    }
    return () => {
      progressAnim.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startProgress, currentStory, onView, progressAnim]);

  const advanceToNext = useCallback(() => {
    progressAnim.stopAnimation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, progressAnim, onClose]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        advanceToNext();
      }
    },
    [advanceToNext],
  );

  const goNext = () => {
    progressAnim.stopAnimation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    progressAnim.stopAnimation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!currentStory) return null;

  return (
    <View className="flex-1 bg-black">
      {/* Progress bars */}
      <View className="absolute left-0 right-0 top-12 z-10 flex-row gap-1 px-2">
        {stories.map((story, i) => (
          <View key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            {i < currentIndex ? (
              <View className="h-full w-full bg-white" />
            ) : i === currentIndex ? (
              <Animated.View
                className="h-full bg-white"
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            ) : null}
          </View>
        ))}
      </View>

      {/* Author info */}
      <View className="absolute left-0 right-0 top-16 z-10 flex-row items-center gap-3 px-4">
        <Avatar size="sm" imageUrl={author.avatarUrl} name={author.displayName} />
        <Text className="text-sm font-semibold text-white">{author.displayName}</Text>
        <Text className="text-xs text-white/70">{formatTimeAgo(currentStory.createdAt)}</Text>
      </View>

      {/* Close button */}
      <Pressable onPress={onClose} className="absolute right-4 top-16 z-10 p-2">
        <Text className="text-lg text-white">✕</Text>
      </Pressable>

      {/* Story media */}
      {currentStory.mediaType === 'video' ? (
        <Video
          ref={videoRef}
          source={{ uri: currentStory.mediaUrl }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          className="flex-1"
          style={{ width: SCREEN_WIDTH }}
        />
      ) : (
        <Image
          source={{ uri: currentStory.mediaUrl }}
          className="flex-1"
          resizeMode="contain"
          style={{ width: SCREEN_WIDTH }}
        />
      )}

      {/* Touch areas for navigation */}
      <View className="absolute inset-0 flex-row" style={{ top: 100 }}>
        <Pressable onPress={goPrev} className="w-1/3" />
        <Pressable onPress={goNext} className="w-2/3" />
      </View>
    </View>
  );
}
