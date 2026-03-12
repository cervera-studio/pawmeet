import type { GroupEventParticipant } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createJoinGroupEvent } from './join-group-event.js';

function buildParticipant(overrides: Partial<GroupEventParticipant> = {}): GroupEventParticipant {
  return {
    id: 'p-1',
    eventId: 'event-1',
    userId: 'user-2',
    dogId: 'dog-2',
    status: 'accepted',
    isOrganizer: false,
    joinedAt: new Date(),
    ...overrides,
  };
}

describe('joinGroupEvent', () => {
  it('joins an event with accepted status when capacity available', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      countParticipants: vi.fn().mockResolvedValue(3),
      addParticipant: vi.fn().mockResolvedValue(buildParticipant()),
      findParticipant: vi.fn().mockResolvedValue(null),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.participant.status).toBe('accepted');
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('joins with waitlisted status when event is full', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      countParticipants: vi.fn().mockResolvedValue(10),
      addParticipant: vi.fn().mockResolvedValue(buildParticipant({ status: 'waitlisted' })),
      findParticipant: vi.fn().mockResolvedValue(null),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'waitlisted' }),
    );
  });

  it('fails when event does not exist', async () => {
    const groupEventRepo = buildGroupEventRepo({ findById: vi.fn().mockResolvedValue(null) });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('fails when already joined', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      findParticipant: vi.fn().mockResolvedValue(buildParticipant()),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_JOINED');
  });

  it('fails when event is cancelled', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent({ status: 'cancelled' })),
      findParticipant: vi.fn().mockResolvedValue(null),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_JOINABLE');
  });
});
