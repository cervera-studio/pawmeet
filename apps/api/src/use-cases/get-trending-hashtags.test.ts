import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createGetTrendingHashtags } from './get-trending-hashtags.js';

describe('getTrendingHashtags', () => {
  it('returns trending hashtags (cache miss path)', async () => {
    const hashtags = [
      { tag: 'dogs', count: 42 },
      { tag: 'park', count: 10 },
    ];
    const feedRepo = buildFeedRepo({
      getTrendingHashtags: vi.fn().mockResolvedValue(hashtags),
    });
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    } as unknown as import('@upstash/redis').Redis;

    const getTrendingHashtags = createGetTrendingHashtags({ feedRepo, redis });

    const result = await getTrendingHashtags(10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.hashtags).toEqual(hashtags);
    expect(feedRepo.getTrendingHashtags).toHaveBeenCalledWith(10);
  });
});
