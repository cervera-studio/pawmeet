import type { GroupEvent, GroupEventParticipant, GroupEventWithParticipants } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GroupEventRepository } from '../ports/group-event-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import { createLeaveGroupEvent } from './leave-group-event.js';

function buildGroupEvent(overrides: Partial<GroupEvent> = {}): GroupEvent {
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
    ...overrides,
  };
}

function buildParticipant(overrides: Partial<GroupEventParticipant> = {}): GroupEventParticipant {
  return {
    id: 'p-2',
    eventId: 'event-1',
    userId: 'user-2',
    dogId: 'dog-2',
    status: 'accepted',
    isOrganizer: false,
    joinedAt: new Date(),
    ...overrides,
  };
}

function buildGroupEventRepo(overrides: Partial<GroupEventRepository> = {}): GroupEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildGroupEvent()),
    findByIdWithParticipants: vi.fn(),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    addParticipant: vi.fn(),
    findParticipant: vi.fn().mockResolvedValue(buildParticipant()),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn(),
    promoteFromWaitlist: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function buildNotificationService(): NotificationService {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('leaveGroupEvent', () => {
  it('removes participant and promotes from waitlist', async () => {
    const promoted = buildParticipant({ userId: 'user-3', status: 'accepted' });
    const groupEventRepo = buildGroupEventRepo({
      promoteFromWaitlist: vi.fn().mockResolvedValue(promoted),
    });
    const notificationService = buildNotificationService();
    const leaveEvent = createLeaveGroupEvent({ groupEventRepo, notificationService });

    const result = await leaveEvent('user-2', 'event-1');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.removeParticipant).toHaveBeenCalledWith('event-1', 'user-2');
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-3' }),
    );
  });

  it('fails when organizer tries to leave', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const notificationService = buildNotificationService();
    const leaveEvent = createLeaveGroupEvent({ groupEventRepo, notificationService });

    const result = await leaveEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORGANIZER_CANNOT_LEAVE');
  });

  it('fails when not a participant', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findParticipant: vi.fn().mockResolvedValue(null),
    });
    const notificationService = buildNotificationService();
    const leaveEvent = createLeaveGroupEvent({ groupEventRepo, notificationService });

    const result = await leaveEvent('user-2', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });
});
