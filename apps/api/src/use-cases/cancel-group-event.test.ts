import type { GroupEventWithParticipants } from '@pawmeet/types';
import { AppError, isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { clearHandlers } from '../domain/events.js';
import { buildGroupEventRepo } from '../test-utils/builders.js';
import { createCancelGroupEvent } from './cancel-group-event.js';

function buildGroupEventWithParticipants(
  overrides: Partial<GroupEventWithParticipants> = {},
): GroupEventWithParticipants {
  return {
    id: 'event-1',
    createdBy: 'user-1',
    title: 'Passeggiata al parco',
    description: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 60,
    location: 'Parco Sempione',
    latitude: 45.4729,
    longitude: 9.1797,
    maxParticipants: 10,
    visibility: 'public',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 2,
    participants: [
      {
        id: 'p-1',
        eventId: 'event-1',
        userId: 'user-1',
        dogId: 'dog-1',
        status: 'accepted',
        isOrganizer: true,
        joinedAt: new Date(),
      },
      {
        id: 'p-2',
        eventId: 'event-1',
        userId: 'user-2',
        dogId: 'dog-2',
        status: 'accepted',
        isOrganizer: false,
        joinedAt: new Date(),
      },
    ],
    ...overrides,
  };
}

describe('cancelGroupEvent', () => {
  it('cancels the event and emits domain event', async () => {
    clearHandlers();
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi.fn().mockResolvedValue(buildGroupEventWithParticipants()),
    });
    const cancelEvent = createCancelGroupEvent({ groupEventRepo });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.updateStatus).toHaveBeenCalledWith('event-1', 'cancelled');
  });

  it('throws when user is not the organizer', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi.fn().mockResolvedValue(buildGroupEventWithParticipants()),
    });
    const cancelEvent = createCancelGroupEvent({ groupEventRepo });

    await expect(cancelEvent('user-2', 'event-1')).rejects.toThrow(AppError);
    await expect(cancelEvent('user-2', 'event-1')).rejects.toThrow(
      expect.objectContaining({ code: 'NOT_ORGANIZER' }),
    );
  });

  it('fails when event is already cancelled', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi
        .fn()
        .mockResolvedValue(buildGroupEventWithParticipants({ status: 'cancelled' })),
    });
    const cancelEvent = createCancelGroupEvent({ groupEventRepo });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('fails when event is completed', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi
        .fn()
        .mockResolvedValue(buildGroupEventWithParticipants({ status: 'completed' })),
    });
    const cancelEvent = createCancelGroupEvent({ groupEventRepo });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('fails when event is in_progress', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi
        .fn()
        .mockResolvedValue(buildGroupEventWithParticipants({ status: 'in_progress' })),
    });
    const cancelEvent = createCancelGroupEvent({ groupEventRepo });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});
