import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStorageService, buildStory, buildStoryRepo } from '../test-utils/builders.js';
import { createConfirmStory } from './confirm-story.js';

describe('createConfirmStory', () => {
  it('confirms a story with valid key', async () => {
    const story = buildStory();
    const storyRepo = buildStoryRepo({
      createStory: vi.fn().mockResolvedValue(story),
    });
    const storage = buildStorageService({
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/stories/user-1/photo.jpg'),
    });
    const confirmStory = createConfirmStory({ storyRepo, storage });

    const result = await confirmStory('user-1', 'stories/user-1/photo.jpg', 'photo');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.story).toEqual(story);
    expect(storyRepo.createStory).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'user-1',
        mediaUrl: 'https://cdn.example.com/stories/user-1/photo.jpg',
        mediaType: 'photo',
        thumbnailUrl: null,
      }),
    );
  });

  it('fails when key does not match user id', async () => {
    const storyRepo = buildStoryRepo();
    const storage = buildStorageService();
    const confirmStory = createConfirmStory({ storyRepo, storage });

    const result = await confirmStory('user-1', 'stories/user-999/photo.jpg', 'photo');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_STORY_KEY');
  });

  it('awards XP when awardXp is provided', async () => {
    const story = buildStory({ id: 'story-99' });
    const storyRepo = buildStoryRepo({
      createStory: vi.fn().mockResolvedValue(story),
    });
    const storage = buildStorageService();
    const awardXp = vi.fn().mockResolvedValue({
      success: true,
      data: { xpAwarded: 10, summary: { totalXp: 100, level: 2, xpToNextLevel: 50 } },
    });
    const confirmStory = createConfirmStory({ storyRepo, storage, awardXp });

    await confirmStory('user-1', 'stories/user-1/photo.jpg', 'photo');

    expect(awardXp).toHaveBeenCalledWith('user-1', 'story_created', { storyId: 'story-99' });
  });
});
