import type { UserActivityWindow } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import type { MatchingAiRepository } from '../ports/index.js';

type Deps = {
  matchingAiRepo: MatchingAiRepository;
};

export function createRecordActivityWindow({ matchingAiRepo }: Deps) {
  return async (
    userId: string,
    dayOfWeek: number,
    hourOfDay: number,
  ): Promise<Result<{ window: UserActivityWindow }>> => {
    const window = await matchingAiRepo.upsertActivityWindow({
      userId,
      dayOfWeek,
      hourOfDay,
    });
    return succeed({ window });
  };
}
