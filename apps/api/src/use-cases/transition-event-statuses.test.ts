import { describe, expect, it, vi } from 'vitest';
import {
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createTransitionEventStatuses } from './transition-event-statuses.js';

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
