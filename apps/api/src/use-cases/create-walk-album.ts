import type { WalkAlbum } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { WalkAlbumRepository } from '../ports/index.js';

type Deps = {
  walkAlbumRepo: WalkAlbumRepository;
};

export function createCreateWalkAlbum({ walkAlbumRepo }: Deps) {
  return async (walkId: string, title: string): Promise<Result<{ album: WalkAlbum }>> => {
    const existing = await walkAlbumRepo.findByWalkId(walkId);
    if (existing) {
      return fail(new AppError('ALBUM_EXISTS', 'Esiste già un album per questa passeggiata', 409));
    }

    const album = await walkAlbumRepo.createAlbum(walkId, title);
    return succeed({ album });
  };
}
