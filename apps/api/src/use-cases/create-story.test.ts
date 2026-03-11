import { MAX_IMAGE_SIZE, MAX_STORIES_PER_DAY, MAX_VIDEO_SIZE } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStorageService, buildStoryRepo } from '../test-utils/builders.js';
import { createCreateStory } from './create-story.js';

describe('createCreateStory', () => {
  it('generates upload URL for a photo story', async () => {
    const storyRepo = buildStoryRepo({ countTodayByAuthor: vi.fn().mockResolvedValue(0) });
    const storage = buildStorageService({
      buildStoryMediaKey: vi.fn().mockReturnValue('stories/user-1/123.jpeg'),
      generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://upload.example.com'),
    });
    const createStory = createCreateStory({ storyRepo, storage });

    const result = await createStory('user-1', 'image/jpeg', 1024);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.uploadUrl).toBe('https://upload.example.com');
    expect(result.data.key).toBe('stories/user-1/123.jpeg');
  });

  it('fails when daily story limit reached', async () => {
    const storyRepo = buildStoryRepo({
      countTodayByAuthor: vi.fn().mockResolvedValue(MAX_STORIES_PER_DAY),
    });
    const storage = buildStorageService();
    const createStory = createCreateStory({ storyRepo, storage });

    const result = await createStory('user-1', 'image/jpeg', 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('STORY_LIMIT_REACHED');
  });

  it('fails when image file is too large', async () => {
    const storyRepo = buildStoryRepo({ countTodayByAuthor: vi.fn().mockResolvedValue(0) });
    const storage = buildStorageService();
    const createStory = createCreateStory({ storyRepo, storage });

    const result = await createStory('user-1', 'image/jpeg', MAX_IMAGE_SIZE + 1);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });

  it('allows larger files for video', async () => {
    const storyRepo = buildStoryRepo({ countTodayByAuthor: vi.fn().mockResolvedValue(0) });
    const storage = buildStorageService({
      buildStoryMediaKey: vi.fn().mockReturnValue('stories/user-1/123.mp4'),
      generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://upload.example.com'),
    });
    const createStory = createCreateStory({ storyRepo, storage });

    // 50 MB video (under 100 MB limit)
    const result = await createStory('user-1', 'video/mp4', 50 * 1024 * 1024);

    expect(isSuccess(result)).toBe(true);
  });
});
