import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getDateLocale } from '@/lib/i18n';
import { type AchievementCardData, useAchievementsViewModel } from './_vm/achievements.view-model';

const SKELETON_KEYS_8 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const MEDAL_SIZE = 120;
const RING_THICKNESS = 6;
const INNER_PADDING = 4;
const ICON_SIZE = 42;

function AchievementsSkeleton() {
  return (
    <View className="px-4 py-4 flex-row flex-wrap gap-3">
      {SKELETON_KEYS_8.map((id) => (
        <View key={id} className="items-center" style={{ width: '47%', height: 190 }}>
          <View className="h-[120px] w-[120px] rounded-full bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
          <View className="mt-3 h-3 w-20 rounded bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
        </View>
      ))}
    </View>
  );
}

/** Pulsating glow wrapper for unlocked medals */
function GlowPulse({ color, children }: { color: string; children: React.ReactNode }) {
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1500 }), withTiming(0.4, { duration: 1500 })),
      -1,
      true,
    );
  }, [glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value,
    shadowRadius: 16,
    elevation: 12,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

/** Premium medal with gradient ring, filled center, and depth effects */
function Medal({
  icon,
  gradientColors,
  fillColor,
  unlocked,
}: {
  icon: string;
  gradientColors: readonly [string, string, string];
  fillColor: string;
  unlocked: boolean;
}) {
  const innerSize = MEDAL_SIZE - (RING_THICKNESS + INNER_PADDING) * 2;

  if (!unlocked) {
    return (
      <View
        style={{
          width: MEDAL_SIZE,
          height: MEDAL_SIZE,
          borderRadius: MEDAL_SIZE / 2,
          borderWidth: RING_THICKNESS,
          borderColor: '#3A3A3C',
          backgroundColor: '#2C2C2E',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.45,
        }}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: '#1C1C1E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons
            name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={ICON_SIZE}
            color="#636366"
          />
        </View>
      </View>
    );
  }

  const medalContent = (
    <LinearGradient
      colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: MEDAL_SIZE,
        height: MEDAL_SIZE,
        borderRadius: MEDAL_SIZE / 2,
        padding: RING_THICKNESS,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: MEDAL_SIZE - RING_THICKNESS * 2,
          height: MEDAL_SIZE - RING_THICKNESS * 2,
          borderRadius: (MEDAL_SIZE - RING_THICKNESS * 2) / 2,
          padding: INNER_PADDING,
          backgroundColor: '#1C1C1E',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LinearGradient
          colors={[gradientColors[1], fillColor, gradientColors[2]]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: '#FFFFFF',
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                }
              : {}),
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: innerSize * 0.2,
              right: innerSize * 0.2,
              height: innerSize * 0.35,
              borderTopLeftRadius: innerSize,
              borderTopRightRadius: innerSize,
              borderBottomLeftRadius: innerSize * 0.6,
              borderBottomRightRadius: innerSize * 0.6,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
          />
          <MaterialCommunityIcons
            name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={ICON_SIZE}
            color="rgba(255,255,255,0.95)"
            style={{
              ...(Platform.OS === 'ios'
                ? {
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }
                : {}),
            }}
          />
        </LinearGradient>
      </View>
    </LinearGradient>
  );

  return <GlowPulse color={fillColor}>{medalContent}</GlowPulse>;
}

/** Animated card with staggered entrance and tap interaction */
function AchievementCard({ card, index }: { card: AchievementCardData; index: number }) {
  const { t } = useTranslation();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const tapScale = useSharedValue(1);
  const tapRotate = useSharedValue(0);

  useEffect(() => {
    const delay = index * 80;
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, [index, scale, opacity]);

  const handleTap = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    tapScale.value = withSequence(
      withTiming(1.15, { duration: 120 }),
      withSpring(1, { damping: 8, stiffness: 300 }),
    );
    tapRotate.value = withSequence(
      withTiming(-3, { duration: 60 }),
      withTiming(3, { duration: 60 }),
      withTiming(-2, { duration: 50 }),
      withTiming(2, { duration: 50 }),
      withSpring(0, { damping: 10, stiffness: 200 }),
    );
  }, [tapScale, tapRotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * tapScale.value }, { rotate: `${tapRotate.value}deg` }],
    opacity: opacity.value,
  }));

  const formattedDate = card.unlockedAt
    ? new Date(card.unlockedAt).toLocaleDateString(getDateLocale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Animated.View
      className="items-center"
      style={[{ width: '47%', marginBottom: 24 }, animatedStyle]}
    >
      <Pressable onPress={handleTap}>
        <Medal
          icon={card.icon}
          gradientColors={card.gradientColors}
          fillColor={card.fillColor}
          unlocked={card.unlocked}
        />
      </Pressable>
      <Text
        className={`mt-3 text-[13px] font-semibold text-center leading-4 ${
          card.unlocked
            ? 'text-neutral-900 dark:text-[#F5F5F7]'
            : 'text-neutral-500 dark:text-[#636366]'
        }`}
        numberOfLines={2}
      >
        {card.label}
      </Text>
      {card.unlocked && formattedDate ? (
        <Text
          className="mt-1 text-xs text-center font-medium"
          style={{ color: card.gradientColors[1] }}
        >
          {formattedDate}
        </Text>
      ) : (
        <Text className="mt-1 text-xs text-[#636366]">{t('profile.dogBadges.locked')}</Text>
      )}
    </Animated.View>
  );
}

export default function AchievementsScreen() {
  const vm = useAchievementsViewModel();
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-[#1C1C1E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.gamification.achievements'),
          headerBackTitle: t('profile.gamification.title'),
        }}
      />

      {vm.loading && vm.cards.length === 0 ? (
        <AchievementsSkeleton />
      ) : (
        <FlatList
          data={vm.cards}
          keyExtractor={(item) => item.type}
          numColumns={2}
          columnWrapperClassName="justify-between px-4"
          contentContainerClassName="py-6"
          renderItem={({ item, index }) => <AchievementCard card={item} index={index} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
