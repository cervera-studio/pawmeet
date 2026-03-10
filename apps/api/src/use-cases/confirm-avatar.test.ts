import type { User } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService, UserRepository } from '../ports/index.js';
import { createConfirmAvatar } from './confirm-avatar.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: '$2b$12$hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    emailVerified: true,
    pushToken: null,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({} as any),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    findPushToken: vi.fn(),
    ...overrides,
  };
}

function buildStorage(overrides: Partial<StorageService> = {}): StorageService {
  return {
    generatePresignedUploadUrl: vi.fn(),
    generateAvatarUploadUrl: vi.fn(),
    buildDogPhotoKey: vi.fn(),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-1/new.jpg'),
    extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-1/old.jpg'),
    ...overrides,
  };
}

describe('confirmAvatar', () => {
  it('confirms avatar and returns public URL', async () => {
    const user = buildUser();
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    const storage = buildStorage();
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
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    const storage = buildStorage();
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    await confirmAvatar('user-1', 'avatars/user-1/new.jpg');

    expect(storage.extractKeyFromUrl).toHaveBeenCalledWith(
      'https://cdn.example.com/avatars/user-1/old.jpg',
    );
    expect(storage.deleteObject).toHaveBeenCalledWith('avatars/user-1/old.jpg');
  });

  it('fails with INVALID_KEY when key does not match user', async () => {
    const userRepo = buildUserRepo();
    const storage = buildStorage();
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    const result = await confirmAvatar('user-1', 'avatars/other-user/photo.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_KEY');
    expect(result.error.status).toBe(403);
  });

  it('continues when deleting old avatar fails', async () => {
    const user = buildUser({ avatarUrl: 'https://cdn.example.com/avatars/user-1/old.jpg' });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    const storage = buildStorage({
      deleteObject: vi.fn().mockRejectedValue(new Error('not found')),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/avatars/user-1/new.jpg'),
      extractKeyFromUrl: vi.fn().mockReturnValue('avatars/user-1/old.jpg'),
    });
    const confirmAvatar = createConfirmAvatar({ userRepo, storage });

    const result = await confirmAvatar('user-1', 'avatars/user-1/new.jpg');

    expect(isSuccess(result)).toBe(true);
  });
});
