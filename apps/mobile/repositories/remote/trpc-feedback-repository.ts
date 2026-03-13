import type { ApiClient } from '@pawmeet/api-client';
import type { FeedbackRating } from '@pawmeet/types';
import type { FeedbackRepository } from '../interfaces';

export function createTrpcFeedbackRepository(api: ApiClient): FeedbackRepository {
  return {
    async submit(walkId, toDogId, rating: FeedbackRating, comment?) {
      await api.feedback.submit.mutate({ walkId, toDogId, rating, comment });
    },
    async getDogRating(dogId) {
      const result = await api.feedback.getDogRating.query({ dogId });
      return { average: result.average, count: result.count };
    },
  };
}
