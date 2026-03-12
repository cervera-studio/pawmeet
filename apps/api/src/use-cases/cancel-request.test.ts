import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEventRepo } from '../test-utils/builders.js';
import { createCancelRequest } from './cancel-request.js';

describe('cancelRequest', () => {
  it('cancels a pending request', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findParticipant: vi.fn().mockResolvedValue({
        status: 'pending',
        userId: 'user-1',
        eventId: 'event-1',
      }),
    });
    const cancel = createCancelRequest({ groupEventRepo });

    const result = await cancel('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.updateParticipantStatus).toHaveBeenCalledWith(
      'event-1',
      'user-1',
      'cancelled',
    );
  });

  it('fails when no pending request exists', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findParticipant: vi.fn().mockResolvedValue(null),
    });
    const cancel = createCancelRequest({ groupEventRepo });

    const result = await cancel('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_PENDING_REQUEST');
  });

  it('fails when request is not pending', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findParticipant: vi.fn().mockResolvedValue({ status: 'accepted' }),
    });
    const cancel = createCancelRequest({ groupEventRepo });

    const result = await cancel('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_PENDING_REQUEST');
  });
});
