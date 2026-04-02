import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo, buildGroupEvent } from '../test-utils/builders.js';
import { createListNearbyEvents } from './list-nearby-events.js';

function buildDeps(
  overrides: {
    groupEventRepo?: Partial<Parameters<typeof createListNearbyEvents>[0]['groupEventRepo']>;
    followRepo?: Partial<Parameters<typeof createListNearbyEvents>[0]['followRepo']>;
  } = {},
) {
  const groupEventRepo = {
    findNearby: vi.fn().mockResolvedValue([]),
    findParticipantStatuses: vi.fn().mockResolvedValue(new Map()),
    ...overrides.groupEventRepo,
  } as Parameters<typeof createListNearbyEvents>[0]['groupEventRepo'];
  const followRepo = buildFollowRepo(overrides.followRepo);
  return { groupEventRepo, followRepo };
}

const defaultInput = {
  latitude: 45.47,
  longitude: 9.18,
  radiusKm: 10,
};

describe('listNearbyEvents', () => {
  it('returns empty array when no events nearby', async () => {
    const deps = buildDeps();
    const execute = createListNearbyEvents(deps);

    const result = await execute('user-1', defaultInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual([]);
  });

  it('enriches events with participant status', async () => {
    const event = { ...buildGroupEvent(), distanceKm: 2.5 };
    const statusMap = new Map([['event-1', { status: 'accepted' as const, isOrganizer: false }]]);
    const deps = buildDeps({
      groupEventRepo: {
        findNearby: vi.fn().mockResolvedValue([event]),
        findParticipantStatuses: vi.fn().mockResolvedValue(statusMap),
      },
    });
    const execute = createListNearbyEvents(deps);

    const result = await execute('user-1', defaultInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].myStatus).toBe('accepted');
  });

  it('sets myStatus to null when user has no participation', async () => {
    const event = { ...buildGroupEvent(), distanceKm: 1.0 };
    const deps = buildDeps({
      groupEventRepo: {
        findNearby: vi.fn().mockResolvedValue([event]),
        findParticipantStatuses: vi.fn().mockResolvedValue(new Map()),
      },
    });
    const execute = createListNearbyEvents(deps);

    const result = await execute('user-1', defaultInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data[0].myStatus).toBeNull();
  });
});
