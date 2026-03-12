import { AppError, fail, type GroupEvent, type Result, succeed } from '@pawmeet/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: GroupEventRepository;
};

export function createListOccurrences({ groupEventRepo }: Deps) {
  return async (eventId: string): Promise<Result<GroupEvent[]>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Evento non trovato', 404));
    }

    // If this is an occurrence, find the parent's occurrences
    const parentId = event.parentEventId ?? event.id;
    const occurrences = await groupEventRepo.findOccurrences(parentId);
    return succeed(occurrences);
  };
}
