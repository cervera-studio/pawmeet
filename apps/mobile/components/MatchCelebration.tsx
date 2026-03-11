import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface MatchCelebrationProps {
  onDismiss: () => void;
  onChat: () => void;
}

export function MatchCelebration({ onDismiss, onChat }: MatchCelebrationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(50);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 8, stiffness: 100 });
    emojiScale.value = withDelay(
      200,
      withSequence(withSpring(1.3, { damping: 5, stiffness: 120 }), withSpring(1, { damping: 10 })),
    );
    buttonsTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));
  }, [opacity, scale, emojiScale, buttonsTranslateY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
    opacity: buttonsTranslateY.value === 50 ? 0 : 1,
  }));

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center bg-black/60"
      style={backdropStyle}
    >
      <Animated.View className="items-center px-8" style={cardStyle}>
        <Animated.View style={emojiStyle}>
          <Text className="text-8xl">🐾</Text>
        </Animated.View>

        <Text className="mt-6 text-4xl font-black text-white">Match!</Text>
        <Text className="mt-2 text-center text-lg text-white/80">
          I vostri cani sono compatibili!
        </Text>
        <Text className="mt-1 text-center text-base text-white/60">
          Inizia una conversazione per organizzare una passeggiata insieme.
        </Text>

        <Animated.View className="mt-8 w-full gap-3" style={buttonsStyle}>
          <Pressable onPress={onChat} className="items-center rounded-2xl bg-primary py-4">
            <Text className="text-lg font-semibold text-white">Invia un messaggio</Text>
          </Pressable>

          <Pressable onPress={onDismiss} className="items-center py-3">
            <Text className="text-base text-white/70">Continua a esplorare</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
