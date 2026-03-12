import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type Badge = RouterOutput['badges']['listByDog']['badges'][number];

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBadges = useCallback(async (dogId: string) => {
    setLoading(true);
    try {
      const { badges: data } = await api.badges.listByDog.query({ dogId });
      setBadges(data);
    } catch (e) {
      logger.warn('useBadges', 'Failed to fetch badges', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { badges, loading, fetchBadges };
}
