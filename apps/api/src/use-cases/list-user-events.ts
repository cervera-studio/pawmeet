import { type GroupEvent, type Result, succeed } from '@pawmeet/types';
import type { GroupEventDiscoveryRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventDiscoveryRepository, 'findByParticipant'>;
};

export function createListUserEvents({ groupEventRepo }: Deps) {
  return async (userId: string): Promise<Result<GroupEvent[]>> => {
    const events = await groupEventRepo.findByParticipant(userId);
    return succeed(events);
  };
}
