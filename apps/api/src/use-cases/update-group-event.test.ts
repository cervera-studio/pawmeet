import { GROUP_EVENT_STATUS, isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createUpdateGroupEvent } from './update-group-event.js';

function buildDeps() {
  const event = buildGroupEvent({ createdBy: 'user-1', status: 'scheduled' });
  return {
    groupEventRepo: buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(event),
      update: vi.fn().mockResolvedValue({ ...event, title: 'Updated' }),
    }),
  };
}

describe('createUpdateGroupEvent', () => {
  it('updates event fields', async () => {
    const deps = buildDeps();
    const updateEvent = createUpdateGroupEvent(deps);

    const result = await updateEvent('user-1', 'event-1', { title: 'Updated' });

    expect(isSuccess(result)).toBe(true);
    expect(deps.groupEventRepo.update).toHaveBeenCalledWith('event-1', { title: 'Updated' });
  });

  it('fails with 404 when event not found', async () => {
    const deps = buildDeps();
    deps.groupEventRepo.findById = vi.fn().mockResolvedValue(null);
    const updateEvent = createUpdateGroupEvent(deps);

    const result = await updateEvent('user-1', 'event-1', { title: 'X' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('fails when user is not the organizer', async () => {
    const deps = buildDeps();
    const updateEvent = createUpdateGroupEvent(deps);

    const result = await updateEvent('other-user', 'event-1', { title: 'X' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_ORGANIZER');
  });

  it('fails when event is cancelled', async () => {
    const deps = buildDeps();
    deps.groupEventRepo.findById = vi
      .fn()
      .mockResolvedValue(
        buildGroupEvent({ createdBy: 'user-1', status: GROUP_EVENT_STATUS.CANCELLED }),
      );
    const updateEvent = createUpdateGroupEvent(deps);

    const result = await updateEvent('user-1', 'event-1', { title: 'X' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('fails when scheduledAt is in the past', async () => {
    const deps = buildDeps();
    const updateEvent = createUpdateGroupEvent(deps);

    const result = await updateEvent('user-1', 'event-1', {
      scheduledAt: new Date('2020-01-01'),
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_INVALID_DATE');
  });
});
