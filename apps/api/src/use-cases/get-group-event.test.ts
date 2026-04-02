import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createGetGroupEvent } from './get-group-event.js';

describe('createGetGroupEvent', () => {
  it('returns event with participants', async () => {
    const event = { ...buildGroupEvent(), participants: [] };
    const deps = {
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    };
    const getEvent = createGetGroupEvent(deps);

    const result = await getEvent('event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('event-1');
  });

  it('fails with 404 when event not found', async () => {
    const deps = {
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(null),
      }),
    };
    const getEvent = createGetGroupEvent(deps);

    const result = await getEvent('event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });
});
