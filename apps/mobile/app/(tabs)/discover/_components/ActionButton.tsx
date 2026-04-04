import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const PRESS_SPRING = { mass: 0.3, damping: 15, stiffness: 300 };

export function ActionButton({
  onPress,
  size,
  bgClass,
  children,
}: {
  onPress: () => void;
  size: 'sm' | 'lg';
  bgClass: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, PRESS_SPRING);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.85, { duration: 60 }),
      withSpring(1.08, { mass: 0.3, damping: 8, stiffness: 200 }),
      withSpring(1, PRESS_SPRING),
    );
    onPress();
  }, [onPress, scale]);

  const sizeClass = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View
        className={`${sizeClass} items-center justify-center rounded-full ${bgClass} shadow-lg`}
        style={animatedStyle}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
