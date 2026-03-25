import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useAchievements } from '@/hooks/useGamification';

/** All known achievement types with Italian labels and emoji icons */
const ACHIEVEMENT_CATALOG = [
  { type: 'FIRST_WALK', label: 'Prima passeggiata', icon: '\u{1F6B6}' },
  { type: 'WALKS_10', label: '10 passeggiate', icon: '\u{1F463}' },
  { type: 'WALKS_50', label: '50 passeggiate', icon: '\u{1F3C3}' },
  { type: 'WALKS_100', label: '100 passeggiate', icon: '\u{26A1}' },
  { type: 'FIRST_MATCH', label: 'Primo match', icon: '\u{1F91D}' },
  { type: 'MATCHES_10', label: '10 match', icon: '\u{2B50}' },
  { type: 'FIRST_GROUP_EVENT', label: 'Primo evento', icon: '\u{1F389}' },
  { type: 'SOCIAL_BUTTERFLY', label: 'Farfalla sociale', icon: '\u{1F98B}' },
  { type: 'MARATHON_WALKER', label: 'Maratoneta', icon: '\u{1F3C5}' },
] as const;

export interface AchievementCardData {
  type: string;
  label: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: Date | null;
}

export function useAchievementsViewModel() {
  const router = useRouter();
  const { achievements, loading, fetchAchievements } = useAchievements();

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  const cards: AchievementCardData[] = useMemo(() => {
    const unlockedMap = new Map(achievements.map((a) => [a.type, a.unlockedAt]));
    return ACHIEVEMENT_CATALOG.map((cat) => ({
      type: cat.type,
      label: cat.label,
      icon: cat.icon,
      unlocked: unlockedMap.has(cat.type),
      unlockedAt: unlockedMap.get(cat.type) ?? null,
    }));
  }, [achievements]);

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
