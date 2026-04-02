import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsProvider } from '../ports/analytics-provider.js';
import type { AppleAuthService } from '../ports/apple-auth-service.js';
import {
  buildAuthService,
  buildDog,
  buildDogRepo,
  buildEmailService,
  buildFeedRepo,
  buildMatchRepo,
  buildStorageService,
  buildStoryRepo,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createDeleteAccount } from './delete-account.js';

function buildOAuthAccountRepo() {
  return {
    findByProviderUid: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    deleteByUserAndProvider: vi.fn(),
  };
}

function buildDeps() {
  const user = buildUser({
    id: 'usr_1',
    email: 'test@example.com',
    passwordHash: 'hashed_pw',
    avatarUrl: 'https://cdn.example.com/avatars/usr_1.jpg',
    createdAt: new Date('2026-01-01'),
  });

  return {
    userRepo: buildUserRepo({
      findByIdWithPassword: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(undefined),
      updatePushToken: vi.fn().mockResolvedValue(undefined),
    }),
    tokenRepo: buildTokenRepo({
      revokeAllUserRefreshTokens: vi.fn().mockResolvedValue(undefined),
    }),
    authService: buildAuthService({
      verifyPassword: vi.fn().mockResolvedValue(true),
    }),
    storage: buildStorageService(),
    dogRepo: buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
      findPhotos: vi
        .fn()
        .mockResolvedValue([{ id: 'photo-1', url: 'https://cdn.example.com/dogs/photo.jpg' }]),
    }),
    matchRepo: buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([{ id: 'match-1' }]),
    }),
    feedRepo: buildFeedRepo({
      getUserPosts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    }),
    storyRepo: buildStoryRepo(),
    emailService: buildEmailService(),
    analyticsProviders: [] as AnalyticsProvider[],
    oauthAccountRepo: buildOAuthAccountRepo(),
  };
}

describe('createDeleteAccount', () => {
  it('deactivates account and returns metadata', async () => {
    const deps = buildDeps();
    const deleteAccount = createDeleteAccount(deps);

    const result = await deleteAccount('usr_1', 'password123');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dogCount).toBe(1);
    expect(result.data.matchCount).toBe(1);
    expect(result.data.accountAgeDays).toBeGreaterThanOrEqual(0);
    expect(deps.userRepo.update).toHaveBeenCalledWith(
      'usr_1',
      expect.objectContaining({
        isActive: false,
        avatarUrl: null,
        latitude: null,
        longitude: null,
      }),
    );
    expect(deps.tokenRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith('usr_1');
    expect(deps.userRepo.updatePushToken).toHaveBeenCalledWith('usr_1', null);
  });

  it('deletes avatar and dog photos from R2', async () => {
    const deps = buildDeps();
    const deleteAccount = createDeleteAccount(deps);

    await deleteAccount('usr_1', 'password123');

    // avatar + 1 dog photo = 2 deleteObject calls
    expect(deps.storage.deleteObject).toHaveBeenCalledTimes(2);
  });

  it('sends confirmation email', async () => {
    const deps = buildDeps();
    const deleteAccount = createDeleteAccount(deps);

    await deleteAccount('usr_1', 'password123');

    expect(deps.emailService.sendAccountDeletedConfirmation).toHaveBeenCalledWith(
      'test@example.com',
      'Mario Rossi',
      'it',
    );
  });

  it('fails with 404 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findByIdWithPassword = vi.fn().mockResolvedValue(null);
    const deleteAccount = createDeleteAccount(deps);

    const result = await deleteAccount('usr_1', 'password123');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with 401 when password is wrong', async () => {
    const deps = buildDeps();
    deps.authService.verifyPassword = vi.fn().mockResolvedValue(false);
    const deleteAccount = createDeleteAccount(deps);

    const result = await deleteAccount('usr_1', 'wrong-password');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_PASSWORD');
    expect(result.error.status).toBe(401);
  });

  it('skips password check for social-only accounts (no passwordHash)', async () => {
    const deps = buildDeps();
    deps.userRepo.findByIdWithPassword = vi
      .fn()
      .mockResolvedValue(buildUser({ id: 'usr_1', passwordHash: null, avatarUrl: null }));
    deps.dogRepo.findByOwner = vi.fn().mockResolvedValue([]);
    deps.matchRepo.findActiveByDogIds = vi.fn().mockResolvedValue([]);
    const deleteAccount = createDeleteAccount(deps);

    const result = await deleteAccount('usr_1', '');

    expect(isSuccess(result)).toBe(true);
    expect(deps.authService.verifyPassword).not.toHaveBeenCalled();
  });

  it('revokes Apple tokens when apple OAuth link exists', async () => {
    const appleAuthService: AppleAuthService = {
      revokeTokens: vi.fn().mockResolvedValue(undefined),
    };
    const deps = buildDeps();
    deps.oauthAccountRepo.findByUserId = vi
      .fn()
      .mockResolvedValue([
        { id: 'oauth-1', userId: 'usr_1', provider: 'apple', providerUserId: 'apple-uid' },
      ]);
    const deleteAccount = createDeleteAccount({
      ...deps,
      appleAuthService,
    });

    await deleteAccount('usr_1', 'password123');

    expect(appleAuthService.revokeTokens).toHaveBeenCalledWith('apple-uid');
  });
});
