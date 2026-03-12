import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStory, buildStoryRepo } from '../test-utils/builders.js';
import { createViewStory } from './view-story.js';

describe('createViewStory', () => {
  it('records a view on another user story', async () => {
    const story = buildStory({
      id: 'story-1',
      authorId: 'user-2',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(story),
      addView: vi.fn().mockResolvedValue({ id: 'view-1' }),
      incrementViewCount: vi.fn().mockResolvedValue(undefined),
    });
    const viewStory = createViewStory({ storyRepo });

    const result = await viewStory('story-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(storyRepo.addView).toHaveBeenCalledWith('story-1', 'user-1');
    expect(storyRepo.incrementViewCount).toHaveBeenCalledWith('story-1');
  });

  it('does not count views on own story', async () => {
    const story = buildStory({
      id: 'story-1',
      authorId: 'user-1',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(story),
    });
    const viewStory = createViewStory({ storyRepo });

    const result = await viewStory('story-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(storyRepo.addView).not.toHaveBeenCalled();
  });

  it('fails when story not found', async () => {
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const viewStory = createViewStory({ storyRepo });

    const result = await viewStory('story-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('STORY_NOT_FOUND');
  });

  it('fails when story is expired', async () => {
    const story = buildStory({
      id: 'story-1',
      authorId: 'user-2',
      expiresAt: new Date(Date.now() - 1000),
    });
    const storyRepo = buildStoryRepo({
      findById: vi.fn().mockResolvedValue(story),
    });
    const viewStory = createViewStory({ storyRepo });

    const result = await viewStory('story-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('STORY_EXPIRED');
  });
});
