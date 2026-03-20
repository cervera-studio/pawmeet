import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type DogRating = RouterOutput['feedback']['getDogRating'];
type WalkFeedbackItem = RouterOutput['feedback']['listByWalk'][number];

export type { DogRating, WalkFeedbackItem };

export function useFeedback() {
  const [submitting, setSubmitting] = useState(false);
  const [dogRating, setDogRating] = useState<DogRating | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [walkFeedback, setWalkFeedback] = useState<WalkFeedbackItem[]>([]);
  const [loadingWalkFeedback, setLoadingWalkFeedback] = useState(false);

  const submitFeedback = useCallback(
    async (walkId: string, toDogId: string, rating: number, comment?: string) => {
      setSubmitting(true);
      try {
        await api.feedback.submit.mutate({
          walkId,
          toDogId,
          rating,
          comment,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const fetchDogRating = useCallback(async (dogId: string) => {
    setLoadingRating(true);
    try {
      const result = await api.feedback.getDogRating.query({ dogId });
      setDogRating(result);
      return result;
    } catch (e) {
      logger.warn('useFeedback', 'Failed to fetch dog rating', e);
      return null;
    } finally {
      setLoadingRating(false);
    }
  }, []);

  const fetchWalkFeedback = useCallback(async (walkId: string) => {
    setLoadingWalkFeedback(true);
    try {
      const result = await api.feedback.listByWalk.query({ walkId });
      setWalkFeedback(result as WalkFeedbackItem[]);
      return result;
    } catch (e) {
      logger.warn('useFeedback', 'Failed to fetch walk feedback', e);
      return null;
    } finally {
      setLoadingWalkFeedback(false);
    }
  }, []);

  return {
    submitting,
    dogRating,
    loadingRating,
    walkFeedback,
    loadingWalkFeedback,
    submitFeedback,
    fetchDogRating,
    fetchWalkFeedback,
  };
}
