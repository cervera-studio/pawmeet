import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStory, buildStoryRepo } from '../test-utils/builders.js';
import { createGetStoryViewers } from './get-story-viewers.js';

describe('createGetStoryViewers', () => {
  it('returns viewers for own story', async () => {
    const story = buildStory({ id: 'story-1', authorId: 'user-1' });
    const viewers = [
      { id: 'user-2', displayName: 'Luigi', avatarUrl: null, viewedAt: new Date() },
      { id: 'user-3', displayName: 'Anna', avatarUrl: null, viewedAt: new Date() },
    ];
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(story),
      getViewers: vi.fn().mockResolvedValue(viewers),
    });
    const getStoryViewers = createGetStoryViewers({ storyRepo });

    const result = await getStoryViewers('story-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(viewers);
    expect(storyRepo.getViewers).toHaveBeenCalledWith('story-1');
  });

  it('fails if story not found', async () => {
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const getStoryViewers = createGetStoryViewers({ storyRepo });

    const result = await getStoryViewers('story-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('STORY_NOT_FOUND');
  });

  it('fails if not the author', async () => {
    const story = buildStory({ id: 'story-1', authorId: 'other-user' });
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(story),
    });
    const getStoryViewers = createGetStoryViewers({ storyRepo });

    const result = await getStoryViewers('story-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FORBIDDEN');
  });
});
