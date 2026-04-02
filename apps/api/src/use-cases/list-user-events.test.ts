import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent } from '../test-utils/builders.js';
import { createListUserEvents } from './list-user-events.js';

describe('createListUserEvents', () => {
  it('returns events for a participant', async () => {
    const events = [buildGroupEvent({ id: 'event-1' }), buildGroupEvent({ id: 'event-2' })];
    const groupEventRepo = {
      findByParticipant: vi.fn().mockResolvedValue(events),
    };
    const execute = createListUserEvents({ groupEventRepo });

    const result = await execute('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('event-1');
    expect(groupEventRepo.findByParticipant).toHaveBeenCalledWith('user-1');
  });
});
