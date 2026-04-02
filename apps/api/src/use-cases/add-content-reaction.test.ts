import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo } from '../test-utils/builders.js';
import { createAddContentReaction } from './add-content-reaction.js';

describe('createAddContentReaction', () => {
  it('adds a reaction successfully', async () => {
    const reaction = {
      id: 'r-1',
      contentType: 'post',
      contentId: 'post-1',
      userId: 'user-1',
      emoji: '❤️',
    };
    const deps = { feedRepo: buildFeedRepo({ addReaction: vi.fn().mockResolvedValue(reaction) }) };
    const addReaction = createAddContentReaction(deps);

    const result = await addReaction('post', 'post-1', 'user-1', '❤️');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.reaction).toEqual(reaction);
  });

  it('fails with 409 on duplicate reaction', async () => {
    const deps = {
      feedRepo: buildFeedRepo({
        addReaction: vi.fn().mockRejectedValue(new Error('unique constraint violated')),
      }),
    };
    const addReaction = createAddContentReaction(deps);

    const result = await addReaction('post', 'post-1', 'user-1', '❤️');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('REACTION_ALREADY_EXISTS');
    expect(result.error.status).toBe(409);
  });

  it('fails with 500 on unexpected error', async () => {
    const deps = {
      feedRepo: buildFeedRepo({
        addReaction: vi.fn().mockRejectedValue(new Error('db down')),
      }),
    };
    const addReaction = createAddContentReaction(deps);

    const result = await addReaction('post', 'post-1', 'user-1', '❤️');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('REACTION_FAILED');
    expect(result.error.status).toBe(500);
  });
});
