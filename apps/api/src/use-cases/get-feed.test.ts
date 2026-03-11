import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createGetFeed } from './get-feed.js';

describe('createGetFeed', () => {
  it('returns feed page with items', async () => {
    const feedPage = { items: [], nextCursor: null };
    const feedRepo = buildFeedRepo({
      getFeedForUser: vi.fn().mockResolvedValue(feedPage),
    });
    const getFeed = createGetFeed({ feedRepo });

    const result = await getFeed('user-1', null, 20);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(feedPage);
    expect(feedRepo.getFeedForUser).toHaveBeenCalledWith('user-1', null, 20);
  });

  it('passes cursor for pagination', async () => {
    const feedPage = { items: [], nextCursor: null };
    const feedRepo = buildFeedRepo({
      getFeedForUser: vi.fn().mockResolvedValue(feedPage),
    });
    const getFeed = createGetFeed({ feedRepo });

    await getFeed('user-1', 'some-cursor', 10);

    expect(feedRepo.getFeedForUser).toHaveBeenCalledWith('user-1', 'some-cursor', 10);
  });
});
