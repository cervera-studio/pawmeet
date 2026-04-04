import type { ScoreBreakdown } from '@pawmeet/types';
import { formatDistance, getTopReasons } from '@pawmeet/utils';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type Ref, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/ui/Avatar';

const FALLBACK_WIDTH = 400;
const SWIPE_THRESHOLD = 120;
const SNAP_BACK_SPRING = { mass: 0.5, damping: 15, stiffness: 150 };

export interface SwipeCardDog {
  dogId: string;
  name: string;
  breed: string;
  age: string;
  distanceKm: number;
  compatibilityScore: number;
  ownerName: string;
  imageUrl: string | null;
  scoreBreakdown?: ScoreBreakdown;
}

export interface SwipeCardRef {
  animateLeft: () => void;
  animateRight: () => void;
}

interface SwipeCardProps {
  ref?: Ref<SwipeCardRef>;
  dog: SwipeCardDog;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onExplanationTap?: () => void;
}

export function SwipeCard({
  ref,
  dog,
  onSwipeRight,
  onSwipeLeft,
  onExplanationTap,
}: SwipeCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardWidth = useSharedValue(FALLBACK_WIDTH);

  const [imageError, setImageError] = useState(false);
  const emitSwipeRight = () => onSwipeRight?.();
  const emitSwipeLeft = () => onSwipeLeft?.();
  const distanceLabel = formatDistance(dog.distanceKm);
  const compatPercent = Math.round(dog.compatibilityScore * 100);
  const topReasonKeys = dog.scoreBreakdown ? getTopReasons(dog.scoreBreakdown) : [];
  const topReasons = topReasonKeys.map((key) => t(key));

  // Imperative API for button-triggered animations
  useImperativeHandle(ref, () => ({
    animateRight() {
      translateX.value = withTiming(cardWidth.value * 1.5, { duration: 300 }, () => {
        runOnJS(emitSwipeRight)();
      });
    },
    animateLeft() {
      translateX.value = withTiming(-cardWidth.value * 1.5, { duration: 300 }, () => {
        runOnJS(emitSwipeLeft)();
      });
    },
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-15, 15])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const threshold = cardWidth.value * 0.3 || SWIPE_THRESHOLD;

      if (event.translationX > threshold) {
        translateX.value = withTiming(cardWidth.value * 1.5, { duration: 300 }, () => {
          runOnJS(emitSwipeRight)();
        });
      } else if (event.translationX < -threshold) {
        translateX.value = withTiming(-cardWidth.value * 1.5, { duration: 300 }, () => {
          runOnJS(emitSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0, SNAP_BACK_SPRING);
        translateY.value = withSpring(0, SNAP_BACK_SPRING);
      }
    });

  const navigateToDetail = () => {
    router.push(`/(modals)/dog-detail?dogId=${dog.dogId}`);
  };

  const tapGesture = Gesture.Tap().onStart(() => {
    runOnJS(navigateToDetail)();
  });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-cardWidth.value, 0, cardWidth.value],
      [-12, 0, 12],
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  // Green tint overlay on swipe right
  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 0.3], Extrapolation.CLAMP),
  }));

  // Red tint overlay on swipe left
  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [0.3, 0], Extrapolation.CLAMP),
  }));

  // Label opacity (appears stronger than tint)
  const likeLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        className="flex-1 w-full overflow-hidden"
        style={cardStyle}
        onLayout={(e) => {
          cardWidth.value = e.nativeEvent.layout.width;
        }}
      >
        {/* Background — fills the card and provides layout height */}
        {dog.imageUrl && !imageError ? (
          <Image
            source={{ uri: dog.imageUrl }}
            className="flex-1 w-full"
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-neutral-900">
            <Avatar name={dog.name} size="lg" />
            <Text className="mt-3 text-lg font-semibold text-neutral-300">{dog.name}</Text>
          </View>
        )}

        {/* Swipe direction tint overlays — full card coverage */}
        <Animated.View
          className="absolute inset-0 bg-emerald-500"
          style={likeOverlayStyle}
          pointerEvents="none"
        />
        <Animated.View
          className="absolute inset-0 bg-red-500"
          style={nopeOverlayStyle}
          pointerEvents="none"
        />

        {/* Like stamp */}
        <Animated.View
          className="absolute left-6 top-16 rounded-lg border-[3px] border-emerald-400 bg-emerald-400/20 px-5 py-2"
          style={[likeLabelStyle, { transform: [{ rotate: '-15deg' }] }]}
          pointerEvents="none"
        >
          <Text className="text-3xl font-black tracking-tight text-emerald-400">MI PIACE</Text>
        </Animated.View>

        {/* Nope stamp */}
        <Animated.View
          className="absolute right-6 top-16 rounded-lg border-[3px] border-red-400 bg-red-400/20 px-5 py-2"
          style={[nopeLabelStyle, { transform: [{ rotate: '15deg' }] }]}
          pointerEvents="none"
        >
          <Text className="text-3xl font-black tracking-tight text-red-400">NO</Text>
        </Animated.View>

        {/* Bottom gradient — tall gradient, not a flat bar */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' }}
          pointerEvents="none"
        />

        {/* Info overlay — sits on top of gradient */}
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-24">
          <View className="flex-row items-end justify-between">
            <View className="flex-1 mr-3">
              {/* Name — hero weight */}
              <Text className="text-[28px] font-extrabold tracking-tight text-white">
                {dog.name}
              </Text>
              {/* Breed — secondary */}
              <Text className="text-[15px] font-medium text-white/80 mt-0.5">{dog.breed}</Text>
              {/* Age + owner — tertiary */}
              <Text className="text-[13px] text-white/60 mt-0.5">
                {dog.age} — {dog.ownerName}
              </Text>
            </View>
            <View className="items-end gap-1.5">
              <View className="rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-sm">
                <Text className="text-[13px] font-semibold text-white">{distanceLabel}</Text>
              </View>
              <Pressable onPress={onExplanationTap} className="items-end gap-1">
                <View className="rounded-full bg-primary/90 px-3.5 py-1.5">
                  <Text className="text-[13px] font-bold text-white">{compatPercent}%</Text>
                </View>
                {topReasons.length > 0 && (
                  <Text className="text-[11px] font-medium text-white/50">
                    {topReasons.join(' · ')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
