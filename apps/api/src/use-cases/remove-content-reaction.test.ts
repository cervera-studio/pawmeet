import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createRemoveContentReaction } from './remove-content-reaction.js';

describe('removeContentReaction', () => {
  it('removes a reaction and succeeds', async () => {
    const feedRepo = buildFeedRepo({
      removeReaction: vi.fn().mockResolvedValue(undefined),
    });
    const removeReaction = createRemoveContentReaction({ feedRepo });

    const result = await removeReaction('post', 'post-1', 'user-1', '🐶');

    expect(isSuccess(result)).toBe(true);
    expect(feedRepo.removeReaction).toHaveBeenCalledWith('post', 'post-1', 'user-1', '🐶');
  });
});
