import { formatDistance } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { Dimensions, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_UP_THRESHOLD = -150;

export interface SwipeCardDog {
  dogId: string;
  name: string;
  breed: string;
  age: string;
  distanceKm: number;
  compatibilityScore: number;
  ownerName: string;
  imageUrl: string | null;
}

interface SwipeCardProps {
  dog: SwipeCardDog;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
}

export function SwipeCard({ dog, onSwipeRight, onSwipeLeft, onSwipeUp }: SwipeCardProps) {
  const router = useRouter();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const distanceLabel = formatDistance(dog.distanceKm);

  const compatPercent = Math.round(dog.compatibilityScore * 100);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - like
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeRight)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - dislike
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeLeft)();
        });
      } else if (event.translationY < SWIPE_UP_THRESHOLD) {
        // Swipe up - superlike
        translateY.value = withTiming(-SCREEN_WIDTH * 2, { duration: 300 }, () => {
          runOnJS(onSwipeUp)();
        });
      } else {
        // Spring back
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(router.push)('/(modals)/dog-detail');
  });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15]);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const superlikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [SWIPE_UP_THRESHOLD, 0], [1, 0]),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className="w-full overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-lg"
        style={[{ aspectRatio: 3 / 4 }, cardStyle]}
      >
        {/* Photo placeholder */}
        <View className="flex-1 items-center justify-center bg-gray-100 dark:bg-[#38383A]">
          <Avatar name={dog.name} size="lg" />
          <Text className="mt-3 text-lg font-semibold text-gray-600 dark:text-[#D1D1D6]">
            {dog.name}
          </Text>
        </View>

        {/* Like overlay */}
        <Animated.View
          className="absolute left-6 top-12 rounded-xl border-4 border-green-500 px-4 py-2"
          style={[likeOpacity, { transform: [{ rotate: '-15deg' }] }]}
        >
          <Text className="text-2xl font-black text-green-500">MI PIACE</Text>
        </Animated.View>

        {/* Nope overlay */}
        <Animated.View
          className="absolute right-6 top-12 rounded-xl border-4 border-red-500 px-4 py-2"
          style={[nopeOpacity, { transform: [{ rotate: '15deg' }] }]}
        >
          <Text className="text-2xl font-black text-red-500">NO</Text>
        </Animated.View>

        {/* Superlike overlay */}
        <Animated.View
          className="absolute bottom-32 self-center rounded-xl border-4 border-blue-500 px-4 py-2"
          style={superlikeOpacity}
        >
          <Text className="text-2xl font-black text-blue-500">SUPER</Text>
        </Animated.View>

        {/* Info overlay at bottom */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/40 p-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-2xl font-bold text-white">{dog.name}</Text>
              <Text className="text-base text-white/80">{dog.breed}</Text>
              <Text className="text-sm text-white/60">
                {dog.age} - {dog.ownerName}
              </Text>
            </View>
            <View className="items-end gap-1">
              <View className="rounded-full bg-white/20 px-3 py-1">
                <Text className="text-sm font-medium text-white">{distanceLabel}</Text>
              </View>
              <View className="rounded-full bg-primary/80 px-3 py-1">
                <Text className="text-sm font-medium text-white">{compatPercent}%</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
