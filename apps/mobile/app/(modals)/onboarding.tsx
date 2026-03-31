import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { logger } from '@pawmeet/utils';
import { api } from '@/lib/trpc';
import { useAuthStore } from '@/stores/auth';

// ---------------------------------------------------------------------------
// Stylized SVG illustrations — unique per slide
// ---------------------------------------------------------------------------

function IllustrationDiscover() {
  return (
    <Svg width={260} height={260} viewBox="0 0 260 260" fill="none">
      <Circle cx={130} cy={130} r={120} fill="#ECFDF5" />
      <Circle cx={130} cy={130} r={95} fill="#D1FAE5" opacity={0.6} />
      <Path
        d="M60 180 Q100 120 130 140 Q160 160 200 100"
        stroke="#059669"
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeLinecap="round"
        fill="none"
      />
      <G transform="translate(65, 130)">
        <Ellipse cx={20} cy={24} rx={18} ry={14} fill="#065F46" />
        <Circle cx={8} cy={12} r={11} fill="#065F46" />
        <Ellipse cx={2} cy={4} rx={5} ry={8} fill="#064E3B" />
        <Circle cx={5} cy={11} r={2.5} fill="white" />
        <Circle cx={4.5} cy={11} r={1.2} fill="#1A1A2E" />
        <Ellipse cx={1} cy={15} rx={2.5} ry={2} fill="#1A1A2E" />
        <Path
          d="M38 18 Q48 4 44 12"
          stroke="#065F46"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x={8} y={35} width={4} height={12} rx={2} fill="#047857" />
        <Rect x={28} y={35} width={4} height={12} rx={2} fill="#047857" />
      </G>
      <G transform="translate(155, 110)">
        <Ellipse cx={20} cy={24} rx={18} ry={14} fill="#C9A84C" />
        <Circle cx={34} cy={14} r={11} fill="#C9A84C" />
        <Ellipse cx={40} cy={6} rx={5} ry={8} fill="#A6872E" />
        <Circle cx={37} cy={13} r={2.5} fill="white" />
        <Circle cx={37.5} cy={13} r={1.2} fill="#1A1A2E" />
        <Ellipse cx={42} cy={17} rx={2.5} ry={2} fill="#1A1A2E" />
        <Path
          d="M2 18 Q-8 4 -4 12"
          stroke="#C9A84C"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x={8} y={35} width={4} height={12} rx={2} fill="#A6872E" />
        <Rect x={28} y={35} width={4} height={12} rx={2} fill="#A6872E" />
      </G>
      <G transform="translate(118, 50)">
        <Path
          d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
          fill="#059669"
        />
        <Circle cx={12} cy={12} r={5} fill="white" />
      </G>
      <Path d="M45 60 L48 55 L51 60 L48 65 Z" fill="#C9A84C" opacity={0.7} />
      <Path d="M210 160 L213 155 L216 160 L213 165 Z" fill="#C9A84C" opacity={0.7} />
      <Circle cx={190} cy={60} r={3} fill="#10B981" opacity={0.5} />
      <Circle cx={70} cy={190} r={2.5} fill="#10B981" opacity={0.5} />
    </Svg>
  );
}

function IllustrationMatch() {
  return (
    <Svg width={260} height={260} viewBox="0 0 260 260" fill="none">
      <Circle cx={130} cy={130} r={120} fill="#FDF8EF" />
      <Circle cx={130} cy={130} r={95} fill="#FAF0D7" opacity={0.5} />
      <Path
        d="M130 200 C130 200 60 150 60 105 C60 75 85 60 110 75 C120 82 130 95 130 95 C130 95 140 82 150 75 C175 60 200 75 200 105 C200 150 130 200 130 200Z"
        fill="#065F46"
        opacity={0.12}
      />
      <Path
        d="M130 185 C130 185 75 145 75 110 C75 85 95 75 115 85 C122 90 130 100 130 100 C130 100 138 90 145 85 C165 75 185 85 185 110 C185 145 130 185 130 185Z"
        fill="#065F46"
        opacity={0.08}
      />
      <G transform="translate(85, 100)">
        <Ellipse cx={15} cy={22} rx={12} ry={10} fill="#065F46" />
        <Circle cx={5} cy={10} r={5} fill="#065F46" />
        <Circle cx={15} cy={6} r={5} fill="#065F46" />
        <Circle cx={25} cy={10} r={5} fill="#065F46" />
      </G>
      <G transform="translate(145, 100)">
        <Ellipse cx={15} cy={22} rx={12} ry={10} fill="#C9A84C" />
        <Circle cx={5} cy={10} r={5} fill="#C9A84C" />
        <Circle cx={15} cy={6} r={5} fill="#C9A84C" />
        <Circle cx={25} cy={10} r={5} fill="#C9A84C" />
      </G>
      <Path
        d="M115 120 Q130 135 145 120"
        stroke="#10B981"
        strokeWidth={2.5}
        strokeDasharray="4 4"
        fill="none"
      />
      <G transform="translate(60, 70)">
        <Path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="#C9A84C" />
      </G>
      <G transform="translate(185, 75)">
        <Path d="M6 0 L7.5 4.5 L12 6 L7.5 7.5 L6 12 L4.5 7.5 L0 6 L4.5 4.5 Z" fill="#C9A84C" />
      </G>
      <G transform="translate(125, 55)">
        <Path
          d="M5 0 L6 3.5 L10 5 L6 6.5 L5 10 L4 6.5 L0 5 L4 3.5 Z"
          fill="#10B981"
          opacity={0.6}
        />
      </G>
      <G transform="translate(50, 160) scale(0.5)">
        <Path
          d="M12 21 C12 21 3 15 3 9 C3 5 6 3 9 5 C10 6 12 8 12 8 C12 8 14 6 15 5 C18 3 21 5 21 9 C21 15 12 21 12 21Z"
          fill="#059669"
          opacity={0.4}
        />
      </G>
      <G transform="translate(190, 170) scale(0.4)">
        <Path
          d="M12 21 C12 21 3 15 3 9 C3 5 6 3 9 5 C10 6 12 8 12 8 C12 8 14 6 15 5 C18 3 21 5 21 9 C21 15 12 21 12 21Z"
          fill="#C9A84C"
          opacity={0.5}
        />
      </G>
    </Svg>
  );
}

function IllustrationWalk() {
  return (
    <Svg width={260} height={260} viewBox="0 0 260 260" fill="none">
      <Circle cx={130} cy={130} r={120} fill="#ECFDF5" />
      <Path
        d="M20 210 Q80 195 130 200 Q180 205 240 190"
        stroke="#D1FAE5"
        strokeWidth={30}
        strokeLinecap="round"
        fill="none"
      />
      <G transform="translate(40, 95)">
        <Rect x={8} y={40} width={6} height={20} rx={3} fill="#047857" />
        <Circle cx={11} cy={35} r={16} fill="#059669" opacity={0.6} />
        <Circle cx={11} cy={28} r={12} fill="#10B981" opacity={0.5} />
      </G>
      <G transform="translate(195, 85)">
        <Rect x={8} y={40} width={6} height={20} rx={3} fill="#047857" />
        <Circle cx={11} cy={35} r={14} fill="#059669" opacity={0.6} />
        <Circle cx={11} cy={28} r={10} fill="#10B981" opacity={0.5} />
      </G>
      <G transform="translate(100, 100)">
        <Circle cx={18} cy={10} r={10} fill="#E0B04E" />
        <Rect x={10} y={20} width={16} height={30} rx={8} fill="#065F46" />
        <Rect x={10} y={48} width={5} height={22} rx={2.5} fill="#064E3B" />
        <Rect x={21} y={48} width={5} height={22} rx={2.5} fill="#064E3B" />
        <Path d="M26 30 L40 40" stroke="#065F46" strokeWidth={4} strokeLinecap="round" />
        <Path
          d="M40 40 Q55 50 60 58"
          stroke="#8E8E93"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </G>
      <G transform="translate(155, 150)">
        <Ellipse cx={18} cy={16} rx={16} ry={11} fill="#C9A84C" />
        <Circle cx={34} cy={8} r={9} fill="#C9A84C" />
        <Ellipse cx={39} cy={2} rx={4} ry={6} fill="#A6872E" />
        <Circle cx={37} cy={7} r={2} fill="white" />
        <Circle cx={37.5} cy={7} r={1} fill="#1A1A2E" />
        <Ellipse cx={41} cy={11} rx={2} ry={1.5} fill="#1A1A2E" />
        <Path
          d="M2 10 Q-6 -4 -2 2"
          stroke="#C9A84C"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Rect x={6} y={24} width={3.5} height={10} rx={1.5} fill="#A6872E" />
        <Rect x={25} y={24} width={3.5} height={10} rx={1.5} fill="#A6872E" />
      </G>
      <Circle cx={210} cy={55} r={18} fill="#C9A84C" opacity={0.3} />
      <Circle cx={210} cy={55} r={12} fill="#E0B04E" opacity={0.4} />
      <G transform="translate(65, 60)">
        <Rect x={0} y={0} width={40} height={26} rx={13} fill="white" />
        <Path d="M15 26 L20 34 L25 26" fill="white" />
        <Circle cx={12} cy={13} r={2.5} fill="#10B981" />
        <Circle cx={20} cy={13} r={2.5} fill="#10B981" />
        <Circle cx={28} cy={13} r={2.5} fill="#10B981" />
      </G>
      <G transform="translate(80, 200) scale(0.3)" opacity={0.3}>
        <Ellipse cx={15} cy={22} rx={12} ry={10} fill="#065F46" />
        <Circle cx={5} cy={10} r={5} fill="#065F46" />
        <Circle cx={15} cy={6} r={5} fill="#065F46" />
        <Circle cx={25} cy={10} r={5} fill="#065F46" />
      </G>
      <G transform="translate(160, 195) scale(0.3)" opacity={0.3}>
        <Ellipse cx={15} cy={22} rx={12} ry={10} fill="#065F46" />
        <Circle cx={5} cy={10} r={5} fill="#065F46" />
        <Circle cx={15} cy={6} r={5} fill="#065F46" />
        <Circle cx={25} cy={10} r={5} fill="#065F46" />
      </G>
    </Svg>
  );
}

const ILLUSTRATIONS = [IllustrationDiscover, IllustrationMatch, IllustrationWalk];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(
    () => [
      {
        title: t('onboarding.slide1Title'),
        description: t('onboarding.slide1Description'),
      },
      {
        title: t('onboarding.slide2Title'),
        description: t('onboarding.slide2Description'),
      },
      {
        title: t('onboarding.slide3Title'),
        description: t('onboarding.slide3Description'),
      },
    ],
    [t],
  );

  const handleComplete = () => {
    completeOnboarding();
    api.users.completeOnboarding.mutate().catch((e) => {
      logger.warn('Onboarding', 'Failed to persist onboarding completion to server', e);
    });
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const isLastSlide = currentSlide >= slides.length - 1;
  const CurrentIllustration = ILLUSTRATIONS[currentSlide] ?? IllustrationDiscover;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Decorative blobs */}
      <View
        style={{
          position: 'absolute',
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: '#D1FAE5',
          opacity: 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -30,
          top: 140,
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#FAF0D7',
          opacity: 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -20,
          bottom: 80,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: '#ECFDF5',
          opacity: 0.5,
        }}
      />

      {/* Skip — top right */}
      <View style={{ alignItems: 'flex-end', paddingRight: 24, paddingTop: 8 }}>
        <Pressable
          onPress={handleComplete}
          hitSlop={12}
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#8E8E93' }}>
            {t('onboarding.skipButton')}
          </Text>
        </Pressable>
      </View>

      {/* Illustration */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <CurrentIllustration />
      </View>

      {/* Text content */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 8 }}>
        <Text
          key={`title-${currentSlide}`}
          style={{
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 34,
            textAlign: 'center',
            color: '#1A1A2E',
            marginBottom: 12,
            letterSpacing: -0.5,
          }}
        >
          {slides[currentSlide]?.title}
        </Text>
        <Text
          key={`desc-${currentSlide}`}
          style={{
            fontSize: 16,
            lineHeight: 24,
            textAlign: 'center',
            color: '#8E8E93',
            marginBottom: 32,
          }}
        >
          {slides[currentSlide]?.description}
        </Text>

        {/* Slide indicators */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 32,
          }}
        >
          {slides.map((slide, index) => (
            <Pressable key={slide.title} onPress={() => setCurrentSlide(index)} hitSlop={8}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: index === currentSlide ? 32 : 8,
                  backgroundColor: index === currentSlide ? '#065F46' : '#C7C7CC',
                }}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Action button */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 16 }}>
        <Pressable
          onPress={isLastSlide ? handleComplete : handleNext}
          style={{
            alignItems: 'center',
            borderRadius: 16,
            paddingVertical: 16,
            backgroundColor: '#065F46',
            shadowColor: '#065F46',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>
            {isLastSlide ? t('onboarding.completeButton') : t('onboarding.nextButton')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
