import {
  AppError,
  fail,
  type GroupEventWithParticipants,
  type Result,
  succeed,
} from '@pawmeet/types';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findByIdWithParticipants'>;
};

export function createGetGroupEvent({ groupEventRepo }: Deps) {
  return async (eventId: string): Promise<Result<GroupEventWithParticipants>> => {
    const event = await groupEventRepo.findByIdWithParticipants(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }
    return succeed(event);
  };
}
