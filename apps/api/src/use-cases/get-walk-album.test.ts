import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedRepo, buildWalkAlbum, buildWalkAlbumRepo } from '../test-utils/builders.js';
import { createGetWalkAlbum } from './get-walk-album.js';

describe('createGetWalkAlbum', () => {
  it('returns album with linked posts', async () => {
    const album = buildWalkAlbum({ walkId: 'walk-1' });
    const walkAlbumRepo = buildWalkAlbumRepo({
      findByWalkId: vi.fn().mockResolvedValue(album),
    });
    const feedItem = {
      id: 'post-1',
      authorId: 'user-1',
      caption: 'Passeggiata',
      walkId: 'walk-1',
      latitude: null,
      longitude: null,
      likesCount: 0,
      commentsCount: 0,
      moderationStatus: 'approved',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: 'user-1', displayName: 'Mario', avatarUrl: null },
      media: [],
      liked: false,
    };
    const feedRepo = buildFeedRepo({
      getFeedForUser: vi.fn().mockResolvedValue({ items: [feedItem], nextCursor: null }),
    });
    const getWalkAlbum = createGetWalkAlbum({ walkAlbumRepo, feedRepo });

    const result = await getWalkAlbum('walk-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.album).toEqual(album);
    expect(result.data.posts).toHaveLength(1);
  });

  it('fails when album not found', async () => {
    const walkAlbumRepo = buildWalkAlbumRepo({
      findByWalkId: vi.fn().mockResolvedValue(null),
    });
    const feedRepo = buildFeedRepo();
    const getWalkAlbum = createGetWalkAlbum({ walkAlbumRepo, feedRepo });

    const result = await getWalkAlbum('walk-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALBUM_NOT_FOUND');
  });
});
