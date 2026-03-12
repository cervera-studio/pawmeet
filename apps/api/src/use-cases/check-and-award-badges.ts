import type { Result } from '@pawmeet/types';
import { BADGE_CRITERIA, BADGE_TYPE, type Badge, type BadgeType, succeed } from '@pawmeet/types';
import type { BadgeRepository } from '../ports/badge-repository.js';
import type { WalkRepository } from '../ports/walk-repository.js';

type Deps = {
  badgeRepo: BadgeRepository;
  walkRepo: WalkRepository;
};

/**
 * Check all badge criteria for a dog and award any newly earned badges.
 * Returns the list of badges awarded during this check.
 */
export function createCheckAndAwardBadges({ badgeRepo, walkRepo }: Deps) {
  return async (dogId: string): Promise<Result<{ awarded: Badge[] }>> => {
    const awarded: Badge[] = [];

    // Count completed walks where this dog participated
    const completedWalks = await walkRepo.countCompletedForDog(dogId);

    // Walk-based badges: check from highest to lowest so we award all applicable
    const walkBadges: Array<{ type: BadgeType; threshold: number }> = [
      { type: BADGE_TYPE.SUPER_SOCIAL, threshold: BADGE_CRITERIA.SUPER_SOCIAL.minCompletedWalks },
      {
        type: BADGE_TYPE.REGULAR_WALKER,
        threshold: BADGE_CRITERIA.REGULAR_WALKER.minCompletedWalks,
      },
      {
        type: BADGE_TYPE.FIRST_MEETING,
        threshold: BADGE_CRITERIA.FIRST_MEETING.minCompletedWalks,
      },
    ];

    for (const { type, threshold } of walkBadges) {
      if (completedWalks >= threshold) {
        const alreadyHas = await badgeRepo.hasBadge(dogId, type);
        if (!alreadyHas) {
          const badge = await badgeRepo.award(dogId, type);
          awarded.push(badge);
        }
      }
    }

    // Rating-based badge: FRIENDLY_DOG
    const ratingStats = await walkRepo.getAverageRatingForDog(dogId);
    if (
      ratingStats.count >= BADGE_CRITERIA.FRIENDLY_DOG.minReviews &&
      ratingStats.average >= BADGE_CRITERIA.FRIENDLY_DOG.minAvgRating
    ) {
      const alreadyHas = await badgeRepo.hasBadge(dogId, BADGE_TYPE.FRIENDLY_DOG);
      if (!alreadyHas) {
        const badge = await badgeRepo.award(dogId, BADGE_TYPE.FRIENDLY_DOG);
        awarded.push(badge);
      }
    }

    return succeed({ awarded });
  };
}
