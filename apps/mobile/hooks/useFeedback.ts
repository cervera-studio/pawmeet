import type { FeedbackRating } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from '@/repositories/container';
import type { DogRating, WalkFeedbackItem } from '@/repositories/interfaces';
import { FEEDBACK_REPOSITORY } from '@/repositories/tokens';

export type { DogRating, WalkFeedbackItem };

const feedbackRepo = container.resolve(FEEDBACK_REPOSITORY);

export function useFeedback() {
  const [submitting, setSubmitting] = useState(false);
  const [dogRating, setDogRating] = useState<DogRating | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  const [walkFeedback, setWalkFeedback] = useState<WalkFeedbackItem[]>([]);
  const [loadingWalkFeedback, setLoadingWalkFeedback] = useState(false);

  const submitFeedback = useCallback(
    async (walkId: string, toDogId: string, rating: FeedbackRating, comment?: string) => {
      setSubmitting(true);
      try {
        await feedbackRepo.submit(walkId, toDogId, rating, comment);
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const fetchDogRating = useCallback(async (dogId: string) => {
    setLoadingRating(true);
    try {
      const result = await feedbackRepo.getDogRating(dogId);
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
      const result = await feedbackRepo.listByWalk(walkId);
      setWalkFeedback(result);
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
