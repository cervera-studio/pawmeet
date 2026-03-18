import type { Badge, Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { BadgeRepository } from '../ports/badge-repository.js';
import type { GroupEventRepository } from '../ports/group-event-repository.js';

type Deps = {
  badgeRepo: BadgeRepository;
  groupEventRepo: Pick<GroupEventRepository, 'findById'>;
};

export function createAwardMainEventBadge({ badgeRepo, groupEventRepo }: Deps) {
  return async (_userId: string, dogId: string, eventId: string): Promise<Result<Badge | null>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event?.isOfficial) {
      return fail(new AppError('NOT_OFFICIAL_EVENT', "L'evento non è un Main Event", 400));
    }

    const already = await badgeRepo.hasBadge(dogId, 'main_event');
    if (already) {
      return succeed(null);
    }

    const badge = await badgeRepo.award(dogId, 'main_event');
    return succeed(badge);
  };
}
