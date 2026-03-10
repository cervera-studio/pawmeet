import { type GroupEvent, type Result, succeed } from '@dogwalk/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

export function createListUserEvents({ groupEventRepo }: Deps) {
  return async (userId: string): Promise<Result<GroupEvent[]>> => {
    const events = await groupEventRepo.findByParticipant(userId);
    return succeed(events);
  };
}
