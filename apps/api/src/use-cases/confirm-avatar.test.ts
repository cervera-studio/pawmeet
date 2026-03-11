import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStorageService, buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createConfirmAvatar } from './confirm-avatar.js';

describe('confirmAvatar', () => {
  it('confirms avatar and returns public URL', async () => {
    const user = buildUser();
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({} as any),
    });
    const storage = buildStorageService({
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-1/new.jpg'),
      extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-1/old.jpg'),
    });
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    const result = await confirmAvatar('user-1', 'avatars/user-1/new.jpg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.avatarUrl).toBe('https://cdn.example.com/avatars/user-1/new.jpg');
    expect(storage.getPublicUrl).toHaveBeenCalledWith('avatars/user-1/new.jpg');
    expect(userRepo.update).toHaveBeenCalledWith('user-1', {
      avatarUrl: 'https://cdn.example.com/avatars/user-1/new.jpg',
    });
  });

  it('deletes old avatar when user has an existing one', async () => {
    const user = buildUser({ avatarUrl: 'https://cdn.example.com/avatars/user-1/old.jpg' });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({} as any),
    });
    const storage = buildStorageService({
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-1/new.jpg'),
      extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-1/old.jpg'),
    });
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    await confirmAvatar('user-1', 'avatars/user-1/new.jpg');

    expect(storage.extractKeyFromUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/avatars/user-1/old.jpg',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith('avatars/user-1/old.jpg');
  });

  it('fails with INVALID_KEY when key does not match user', async () => {
    const userRepo = buildUserRepo();
    const storage = buildStorageService();
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    const result = await confirmAvatar('user-1', 'avatars/other-user/photo.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_KEY');
    expect(result.error.status).toBe(403);
  });

  it('continues when deleting old avatar fails', async () => {
    const user = buildUser({ avatarUrl: 'https://cdn.example.com/avatars/user-1/old.jpg' });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({} as any),
    });
    const storage = buildStorageService({
      deleteObject: vi.fn().mockRejectedValue(new Error('not found')),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-1/new.jpg'),
      extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-1/old.jpg'),
    });
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    const result = await confirmAvatar('user-1', 'avatars/user-1/new.jpg');

    expect(isSuccess(result)).toBe(true);
  });
});
