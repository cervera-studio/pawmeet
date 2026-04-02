import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStorageService, buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createDeleteAvatar } from './delete-avatar.js';

function buildDeps() {
  return {
    userRepo: buildUserRepo({
      findById: vi
        .fn()
        .mockResolvedValue(buildUser({ avatarUrl: 'https://cdn.example.com/avatars/usr_1.jpg' })),
      update: vi.fn().mockResolvedValue(undefined),
    }),
    storage: buildStorageService(),
  };
}

describe('createDeleteAvatar', () => {
  it('deletes avatar from storage and clears URL in DB', async () => {
    const deps = buildDeps();
    const deleteAvatar = createDeleteAvatar(deps);

    const result = await deleteAvatar('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Avatar deleted');
    expect(deps.storage.extractKeyFromUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/avatars/usr_1.jpg',
    );
    expect(deps.storage.deleteObject).toHaveBeenCalledWith('photos/photo.jpg');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', { avatarUrl: null });
  });

  it('fails with 404 when user has no avatar', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(buildUser({ avatarUrl: null }));
    const deleteAvatar = createDeleteAvatar(deps);

    const result = await deleteAvatar('usr_1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_AVATAR');
    expect(result.error.status).toBe(404);
  });

  it('fails with 404 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(null);
    const deleteAvatar = createDeleteAvatar(deps);

    const result = await deleteAvatar('usr_1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_AVATAR');
    expect(result.error.status).toBe(404);
  });
});
