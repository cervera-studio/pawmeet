import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createListFeaturedEvents } from './list-featured-events.js';

describe('listFeaturedEvents', () => {
  it('returns featured events', async () => {
    const featured = [
      buildGroupEvent({ id: 'e-1', isOfficial: true }),
      buildGroupEvent({ id: 'e-2', isOfficial: true }),
    ];

    const groupEventRepo = buildGroupEventRepo({
      findFeatured: vi.fn().mockResolvedValue(featured),
    });

    const listFeatured = createListFeaturedEvents({ groupEventRepo });
    const result = await listFeatured(1, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(2);
    expect(groupEventRepo.findFeatured).toHaveBeenCalledWith(10, 0);
  });

  it('handles empty results', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findFeatured: vi.fn().mockResolvedValue([]),
    });

    const listFeatured = createListFeaturedEvents({ groupEventRepo });
    const result = await listFeatured(1, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(0);
  });

  it('passes correct offset for pagination', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findFeatured: vi.fn().mockResolvedValue([]),
    });

    const listFeatured = createListFeaturedEvents({ groupEventRepo });
    await listFeatured(3, 10);

    expect(groupEventRepo.findFeatured).toHaveBeenCalledWith(10, 20);
  });
});
