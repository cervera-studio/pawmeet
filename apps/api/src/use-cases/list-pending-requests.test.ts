import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createListPendingRequests } from './list-pending-requests.js';

describe('listPendingRequests', () => {
  it('returns pending participants for organizer', async () => {
    const pending = [
      {
        participant: { id: 'p-1', userId: 'user-2', status: 'pending' },
        displayName: 'Mario',
        avatarUrl: null,
        dogName: 'Rex',
      },
    ];
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent({ createdBy: 'host-1' })),
      findPendingParticipants: vi.fn().mockResolvedValue(pending),
    });
    const listPending = createListPendingRequests({ groupEventRepo });

    const result = await listPending('host-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.displayName).toBe('Mario');
  });

  it('fails if not organizer', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent({ createdBy: 'host-1' })),
    });
    const listPending = createListPendingRequests({ groupEventRepo });

    const result = await listPending('other-user', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_ORGANIZER');
  });

  it('fails if event not found', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const listPending = createListPendingRequests({ groupEventRepo });

    const result = await listPending('host-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });
});
