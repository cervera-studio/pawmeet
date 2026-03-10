import type { Badge, Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { BadgeRepository } from '../ports/badge-repository.js';

type Deps = {
  badgeRepo: BadgeRepository;
};

/** List all badges for a given dog. */
export function createListBadges({ badgeRepo }: Deps) {
  return async (dogId: string): Promise<Result<{ badges: Badge[] }>> => {
    const badges = await badgeRepo.findByDog(dogId);
    return succeed({ badges });
  };
}
