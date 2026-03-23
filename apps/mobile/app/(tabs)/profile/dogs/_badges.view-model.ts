import type { RouterOutput } from '@pawmeet/api-client';
import { BADGE_TYPE } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidUUID } from '@/lib/deep-link-validation';
import { api } from '@/lib/trpc';

type Badge = RouterOutput['badges']['listByDog']['badges'][number];

/** All known badge types with i18n keys and emoji icons */
const BADGE_CATALOG = [
  { type: BADGE_TYPE.FIRST_MEETING, icon: '\u{1F91D}', labelKey: 'badges.firstMeeting' },
  { type: BADGE_TYPE.REGULAR_WALKER, icon: '\u{1F6B6}', labelKey: 'badges.regularWalker' },
  { type: BADGE_TYPE.SUPER_SOCIAL, icon: '\u{2B50}', labelKey: 'badges.superSocial' },
  { type: BADGE_TYPE.FRIENDLY_DOG, icon: '\u{1F415}', labelKey: 'badges.friendlyDog' },
] as const;

export interface BadgeCardData {
  type: string;
  icon: string;
  label: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export function useBadgesGridViewModel() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ dogId: string }>();
  const validDogId = params.dogId && isValidUUID(params.dogId) ? params.dogId : undefined;

  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!validDogId) return;
    setLoading(true);
    try {
      const { badges: data } = await api.badges.listByDog.query({ dogId: validDogId });
      setBadges(data);
    } catch (e) {
      logger.warn('BadgesGrid', 'Failed to fetch badges', e);
    } finally {
      setLoading(false);
    }
  }, [validDogId]);

  useEffect(() => {
    void fetchBadges();
  }, [fetchBadges]);

  const cards: BadgeCardData[] = useMemo(() => {
    const unlockedMap = new Map(badges.map((b) => [b.type, b.awardedAt ?? null]));
    return BADGE_CATALOG.map((cat) => ({
      type: cat.type,
      icon: cat.icon,
      label: t(cat.labelKey),
      unlocked: unlockedMap.has(cat.type),
      unlockedAt: unlockedMap.get(cat.type) ?? null,
    }));
  }, [badges, t]);

  return {
    cards,
    loading,
    dogId: validDogId,
    refresh: fetchBadges,
  };
}
