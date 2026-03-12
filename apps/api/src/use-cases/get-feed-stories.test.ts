import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStoryRepo } from '../test-utils/builders.js';
import { createGetFeedStories } from './get-feed-stories.js';

describe('createGetFeedStories', () => {
  it('returns story groups for a user', async () => {
    const groups = [
      {
        authorId: 'user-2',
        displayName: 'Luigi Verdi',
        avatarUrl: null,
        stories: [
          {
            id: 'story-1',
            authorId: 'user-2',
            mediaUrl: 'https://cdn.example.com/stories/user-2/photo.jpg',
            mediaType: 'photo',
            thumbnailUrl: null,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            viewCount: 3,
            createdAt: new Date(),
            viewed: false,
          },
        ],
      },
    ];
    const storyRepo = buildStoryRepo({
      findActiveStoriesForFeed: vi.fn().mockResolvedValue(groups),
    });
    const getFeedStories = createGetFeedStories({ storyRepo });

    const result = await getFeedStories('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.groups).toHaveLength(1);
    expect(result.data.groups[0].authorId).toBe('user-2');
  });

  it('returns empty groups when no active stories', async () => {
    const storyRepo = buildStoryRepo({
      findActiveStoriesForFeed: vi.fn().mockResolvedValue([]),
    });
    const getFeedStories = createGetFeedStories({ storyRepo });

    const result = await getFeedStories('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.groups).toHaveLength(0);
  });
});
