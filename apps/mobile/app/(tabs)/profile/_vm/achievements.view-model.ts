import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAchievements } from '@/hooks/useGamification';

/** All known achievement types with i18n keys, vector icons, and medal palettes */
const ACHIEVEMENT_CATALOG = [
  {
    type: 'FIRST_WALK',
    labelKey: 'achievements.firstWalk',
    icon: 'walk',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#34D399', '#10B981', '#047857'] as const,
    fillColor: '#059669',
  },
  {
    type: 'WALKS_10',
    labelKey: 'achievements.walks10',
    icon: 'shoe-print',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#5EEAD4', '#14B8A6', '#0F766E'] as const,
    fillColor: '#0D9488',
  },
  {
    type: 'WALKS_50',
    labelKey: 'achievements.walks50',
    icon: 'fire',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#FCD34D', '#F59E0B', '#B45309'] as const,
    fillColor: '#D97706',
  },
  {
    type: 'WALKS_100',
    labelKey: 'achievements.walks100',
    icon: 'lightning-bolt',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#FDBA74', '#F97316', '#C2410C'] as const,
    fillColor: '#EA580C',
  },
  {
    type: 'FIRST_MATCH',
    labelKey: 'achievements.firstMatch',
    icon: 'handshake-outline',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#A5B4FC', '#6366F1', '#4338CA'] as const,
    fillColor: '#4F46E5',
  },
  {
    type: 'MATCHES_10',
    labelKey: 'achievements.matches10',
    icon: 'star-four-points',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#C4B5FD', '#8B5CF6', '#6D28D9'] as const,
    fillColor: '#7C3AED',
  },
  {
    type: 'FIRST_GROUP_EVENT',
    labelKey: 'achievements.firstGroupEvent',
    icon: 'account-group',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#7DD3FC', '#0EA5E9', '#0369A1'] as const,
    fillColor: '#0284C7',
  },
  {
    type: 'SOCIAL_BUTTERFLY',
    labelKey: 'achievements.socialButterfly',
    icon: 'butterfly',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#F9A8D4', '#EC4899', '#BE185D'] as const,
    fillColor: '#DB2777',
  },
  {
    type: 'MARATHON_WALKER',
    labelKey: 'achievements.marathonWalker',
    icon: 'trophy',
    iconSet: 'MaterialCommunityIcons' as const,
    gradientColors: ['#FCA5A5', '#EF4444', '#B91C1C'] as const,
    fillColor: '#DC2626',
  },
] as const;

export interface AchievementCardData {
  type: string;
  label: string;
  icon: string;
  iconSet: string;
  gradientColors: readonly [string, string, string];
  fillColor: string;
  unlocked: boolean;
  unlockedAt: Date | null;
}

export function useAchievementsViewModel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { achievements, loading, fetchAchievements } = useAchievements();

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  const cards: AchievementCardData[] = useMemo(() => {
    const unlockedMap = new Map(achievements.map((a) => [a.type, a.unlockedAt]));
    return ACHIEVEMENT_CATALOG.map((cat) => ({
      type: cat.type,
      label: t(cat.labelKey),
      icon: cat.icon,
      iconSet: cat.iconSet,
      gradientColors: cat.gradientColors,
      fillColor: cat.fillColor,
      unlocked: unlockedMap.has(cat.type),
      unlockedAt: unlockedMap.get(cat.type) ?? null,
    }));
  }, [achievements, t]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    cards,
    loading,
    goBack,
    refresh: fetchAchievements,
  };
}
