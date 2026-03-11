import type { SwipeScoreLog } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { MatchingAiRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
};

export function createLogSwipeScores({ matchingAiRepo }: Deps) {
  return async (input: {
    swiperDogId: string;
    swipedDogId: string;
    direction: 'like' | 'pass';
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
    overallScore: number;
  }): Promise<Result<{ log: SwipeScoreLog }>> => {
    const log = await matchingAiRepo.createSwipeScoreLog(input);
    return succeed({ log });
  };
}
