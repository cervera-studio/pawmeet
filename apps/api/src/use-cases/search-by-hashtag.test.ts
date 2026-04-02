import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createSearchByHashtag } from './search-by-hashtag.js';

describe('searchByHashtag', () => {
  it('returns posts matching the hashtag', async () => {
    const page = { items: [{ id: 'post-1' }], nextCursor: null };
    const feedRepo = buildFeedRepo({
      searchPostsByHashtag: vi.fn().mockResolvedValue(page),
    });
    const searchByHashtag = createSearchByHashtag({ feedRepo });

    const result = await searchByHashtag('dogs', null, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(page);
    expect(feedRepo.searchPostsByHashtag).toHaveBeenCalledWith('dogs', null, 10);
  });
});
