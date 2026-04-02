import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createListOccurrences } from './list-occurrences.js';

describe('createListOccurrences', () => {
  it('returns occurrences for a parent event', async () => {
    const deps = {
      groupEventRepo: {
        ...buildGroupEventRepo(),
        findById: vi
          .fn()
          .mockResolvedValue(buildGroupEvent({ id: 'parent-1', parentEventId: null })),
        findOccurrences: vi
          .fn()
          .mockResolvedValue([buildGroupEvent({ id: 'occ-1', parentEventId: 'parent-1' })]),
      },
    };
    const listOccurrences = createListOccurrences(deps);

    const result = await listOccurrences('parent-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(deps.groupEventRepo.findOccurrences).toHaveBeenCalledWith('parent-1');
  });

  it('finds parent occurrences when given an occurrence ID', async () => {
    const deps = {
      groupEventRepo: {
        ...buildGroupEventRepo(),
        findById: vi
          .fn()
          .mockResolvedValue(buildGroupEvent({ id: 'occ-1', parentEventId: 'parent-1' })),
        findOccurrences: vi.fn().mockResolvedValue([]),
      },
    };
    const listOccurrences = createListOccurrences(deps);

    await listOccurrences('occ-1');

    expect(deps.groupEventRepo.findOccurrences).toHaveBeenCalledWith('parent-1');
  });

  it('fails with 404 when event not found', async () => {
    const deps = {
      groupEventRepo: {
        ...buildGroupEventRepo(),
        findById: vi.fn().mockResolvedValue(null),
        findOccurrences: vi.fn(),
      },
    };
    const listOccurrences = createListOccurrences(deps);

    const result = await listOccurrences('event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });
});
