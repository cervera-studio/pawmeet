import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildWalkAlbum, buildWalkAlbumRepo } from '../test-utils/builders.js';
import { createCreateWalkAlbum } from './create-walk-album.js';

describe('createCreateWalkAlbum', () => {
  it('creates an album for a walk', async () => {
    const album = buildWalkAlbum({ walkId: 'walk-1', title: 'Al parco' });
    const walkAlbumRepo = buildWalkAlbumRepo({
      findByWalkId: vi.fn().mockResolvedValue(null),
      createAlbum: vi.fn().mockResolvedValue(album),
    });
    const createWalkAlbum = createCreateWalkAlbum({ walkAlbumRepo });

    const result = await createWalkAlbum('walk-1', 'Al parco');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.album).toEqual(album);
    expect(walkAlbumRepo.createAlbum).toHaveBeenCalledWith('walk-1', 'Al parco');
  });

  it('fails when album already exists for the walk', async () => {
    const existing = buildWalkAlbum({ walkId: 'walk-1' });
    const walkAlbumRepo = buildWalkAlbumRepo({
      findByWalkId: vi.fn().mockResolvedValue(existing),
    });
    const createWalkAlbum = createCreateWalkAlbum({ walkAlbumRepo });

    const result = await createWalkAlbum('walk-1', 'Duplicato');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALBUM_EXISTS');
  });
});
