import { type Result, succeed } from '@pawmeet/types';
import type { FeedbackRepository } from '../ports/index.js';

type Deps = {
  feedbackRepo: FeedbackRepository;
};

type DogRating = {
  average: number | null;
  count: number;
};

export function createGetDogRating({ feedbackRepo }: Deps) {
  return async (dogId: string): Promise<Result<DogRating>> => {
    const rating = await feedbackRepo.getAverageRating(dogId);
    return succeed(rating);
  };
}
