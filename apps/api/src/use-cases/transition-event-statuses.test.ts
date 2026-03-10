import type { GroupEvent } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GroupEventRepository, NotificationService } from '../ports/index.js';
import { createTransitionEventStatuses } from './transition-event-statuses.js';

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

function buildGroupEventRepo(overrides: Partial<GroupEventRepository> = {}): GroupEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithParticipants: vi.fn(),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    findScheduledPastStart: vi.fn().mockResolvedValue([]),
    findInProgressPastEnd: vi.fn().mockResolvedValue([]),
    addParticipant: vi.fn(),
    findParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn(),
    promoteFromWaitlist: vi.fn(),
    ...overrides,
  };
}

function buildNotificationService(): NotificationService {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('transitionEventStatuses', () => {
  it('transitions scheduled events to in_progress', async () => {
    const event = buildGroupEvent({ id: 'event-1', status: 'scheduled' });
    const groupEventRepo = buildGroupEventRepo({
      findScheduledPastStart: vi.fn().mockResolvedValue([event]),
    });
    const transition = createTransitionEventStatuses({
      groupEventRepo,
      notificationService: buildNotificationService(),
    });

    const result = await transition();

    expect(result.startedCount).toBe(1);
    expect(groupEventRepo.updateStatus).toHaveBeenCalledWith('event-1', 'in_progress');
  });

  it('transitions in_progress events to completed', async () => {
    const event = buildGroupEvent({ id: 'event-2', status: 'in_progress' });
    const groupEventRepo = buildGroupEventRepo({
      findInProgressPastEnd: vi.fn().mockResolvedValue([event]),
    });
    const transition = createTransitionEventStatuses({
      groupEventRepo,
      notificationService: buildNotificationService(),
    });

    const result = await transition();

    expect(result.completedCount).toBe(1);
    expect(groupEventRepo.updateStatus).toHaveBeenCalledWith('event-2', 'completed');
  });

  it('handles no events to transition', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const transition = createTransitionEventStatuses({
      groupEventRepo,
      notificationService: buildNotificationService(),
    });

    const result = await transition();

    expect(result.startedCount).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(groupEventRepo.updateStatus).not.toHaveBeenCalled();
  });
});
