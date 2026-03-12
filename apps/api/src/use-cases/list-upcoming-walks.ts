import type { Result, Walk } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { WalkRepository } from '../ports/index.js';

type Deps = {
  walkRepo: WalkRepository;
};

export function createListUpcomingWalks({ walkRepo }: Deps) {
  return async (userId: string): Promise<Result<{ walks: Walk[] }>> => {
    const walks = await walkRepo.findUpcoming(userId);
    return succeed({ walks });
  };
}
