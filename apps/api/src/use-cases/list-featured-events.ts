import type { GroupEvent, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

export function createListFeaturedEvents({ groupEventRepo }: Deps) {
  return async (page: number, pageSize: number): Promise<Result<GroupEvent[]>> => {
    const offset = (page - 1) * pageSize;
    const events = await groupEventRepo.findFeatured(pageSize, offset);
    return succeed(events);
  };
}
