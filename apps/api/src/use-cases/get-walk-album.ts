import type { WalkAlbum } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository, WalkAlbumRepository } from '../ports/index.js';

type Deps = {
  walkAlbumRepo: WalkAlbumRepository;
  feedRepo: FeedRepository;
};

export function createGetWalkAlbum({ walkAlbumRepo, feedRepo }: Deps) {
  return async (
    walkId: string,
    userId: string,
  ): Promise<Result<{ album: WalkAlbum; posts: import('@dogwalk/types').FeedItem[] }>> => {
    const album = await walkAlbumRepo.findByWalkId(walkId);
    if (!album) {
      return fail(new AppError('ALBUM_NOT_FOUND', 'Album non trovato', 404));
    }

    // Get posts linked to this walk
    const feed = await feedRepo.getFeedForUser(userId, null, 100);
    const albumPosts = feed.items.filter((item) => item.walkId === walkId);

    return succeed({ album, posts: albumPosts });
  };
}
