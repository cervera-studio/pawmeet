import type { WalkAlbum } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { WalkAlbumRepository } from '../ports/index.js';

type Deps = {
  walkAlbumRepo: WalkAlbumRepository;
};

export function createCreateWalkAlbum({ walkAlbumRepo }: Deps) {
  return async (walkId: string, title: string): Promise<Result<{ album: WalkAlbum }>> => {
    const existing = await walkAlbumRepo.findByWalkId(walkId);
    if (existing) {
      return fail(new AppError('ALBUM_EXISTS', ERROR_MESSAGES.ALBUM_EXISTS, 409));
    }

    const album = await walkAlbumRepo.createAlbum(walkId, title);
    return succeed({ album });
  };
}
