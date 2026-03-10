import type { WalkFeedback } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { FeedbackRepository } from '../ports/index.js';

type Deps = {
  feedbackRepo: FeedbackRepository;
};

export function createListWalkFeedback({ feedbackRepo }: Deps) {
  return async (walkId: string): Promise<Result<WalkFeedback[]>> => {
    const feedback = await feedbackRepo.findByWalk(walkId);
    return succeed(feedback);
  };
}
