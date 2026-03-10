import type { GroupEvent, GroupEventParticipant, GroupEventWithParticipants } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GroupEventRepository } from '../ports/group-event-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
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

function buildGroupEventRepo(overrides: Partial<GroupEventRepository> = {}): GroupEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithParticipants: vi.fn().mockResolvedValue(buildGroupEventWithParticipants()),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    addParticipant: vi.fn(),
    findParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn(),
    promoteFromWaitlist: vi.fn(),
    findScheduledPastStart: vi.fn(),
    findInProgressPastEnd: vi.fn(),
    ...overrides,
  };
}

function buildNotificationService(): NotificationService {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('cancelGroupEvent', () => {
  it('cancels the event and notifies participants', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const notificationService = buildNotificationService();
    const cancelEvent = createCancelGroupEvent({ groupEventRepo, notificationService });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.updateStatus).toHaveBeenCalledWith('event-1', 'cancelled');
    // Should notify user-2 but not user-1 (organizer)
    expect(notificationService.send).toHaveBeenCalledTimes(1);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
  });

  it('fails when user is not the organizer', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const notificationService = buildNotificationService();
    const cancelEvent = createCancelGroupEvent({ groupEventRepo, notificationService });

    const result = await cancelEvent('user-2', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_ORGANIZER');
  });

  it('fails when event is already cancelled', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findByIdWithParticipants: vi
        .fn()
        .mockResolvedValue(buildGroupEventWithParticipants({ status: 'cancelled' })),
    });
    const notificationService = buildNotificationService();
    const cancelEvent = createCancelGroupEvent({ groupEventRepo, notificationService });

    const result = await cancelEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_ALREADY_CANCELLED');
  });
});
