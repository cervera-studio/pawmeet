import type { GroupEventParticipant } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createLeaveGroupEvent } from './leave-group-event.js';

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

describe('leaveGroupEvent', () => {
  it('removes participant and promotes from waitlist', async () => {
    const promoted = buildParticipant({ userId: 'user-3', status: 'accepted' });
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      findParticipant: vi.fn().mockResolvedValue(buildParticipant()),
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
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      findParticipant: vi.fn().mockResolvedValue(buildParticipant()),
      promoteFromWaitlist: vi.fn().mockResolvedValue(null),
    });
    const notificationService = buildNotificationService();
    const leaveEvent = createLeaveGroupEvent({ groupEventRepo, notificationService });

    const result = await leaveEvent('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORGANIZER_CANNOT_LEAVE');
  });

  it('fails when not a participant', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent()),
      findParticipant: vi.fn().mockResolvedValue(null),
      promoteFromWaitlist: vi.fn().mockResolvedValue(null),
    });
    const notificationService = buildNotificationService();
    const leaveEvent = createLeaveGroupEvent({ groupEventRepo, notificationService });

    const result = await leaveEvent('user-2', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });
});
