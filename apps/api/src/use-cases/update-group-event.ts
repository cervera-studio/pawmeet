import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  type GroupEvent,
  type Result,
  succeed,
} from '@pawmeet/types';
import { assertOwnership } from '../domain/ownership.js';
import type { GroupEventRepository } from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'findById' | 'update'>;
};

type UpdateGroupEventInput = {
  title?: string;
  description?: string | null;
  scheduledAt?: Date;
  durationMin?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  maxParticipants?: number;
};

export function createUpdateGroupEvent({ groupEventRepo }: Deps) {
  return async (
    userId: string,
    eventId: string,
    input: UpdateGroupEventInput,
  ): Promise<Result<GroupEvent>> => {
    const event = await groupEventRepo.findById(eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    assertOwnership(
      event.createdBy,
      userId,
      'NOT_ORGANIZER',
      'Only the organizer can modify the event',
    );

    if (
      event.status === GROUP_EVENT_STATUS.CANCELLED ||
      event.status === GROUP_EVENT_STATUS.COMPLETED
    ) {
      return fail(new AppError('EVENT_NOT_EDITABLE', 'Evento non modificabile', 400));
    }

    if (input.scheduledAt && input.scheduledAt <= new Date()) {
      return fail(new AppError('EVENT_INVALID_DATE', 'La data deve essere nel futuro', 400));
    }

    const updated = await groupEventRepo.update(eventId, input);
    return succeed(updated);
  };
}
