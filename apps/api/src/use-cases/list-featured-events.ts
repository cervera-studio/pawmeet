import type { GroupEvent, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GroupEventDiscoveryRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventDiscoveryRepository, 'findFeatured'>;
};

export function createListFeaturedEvents({ groupEventRepo }: Deps) {
  return async (page: number, pageSize: number): Promise<Result<GroupEvent[]>> => {
    const offset = (page - 1) * pageSize;
    const events = await groupEventRepo.findFeatured(pageSize, offset);
    return succeed(events);
  };
}
