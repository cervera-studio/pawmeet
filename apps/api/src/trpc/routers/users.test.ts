import type { SafeUser } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { userDeps } from '../../container/index.js';
import type { NearbyUser } from '../../ports/index.js';
import { router } from '../trpc.js';
import { createUsersRouter } from './users.js';

// ── Builders ──────────────────────────────────────────────────────────────────

function buildSafeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 10,
    emailVerified: true,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildNearbyUser(overrides: Partial<NearbyUser> = {}): NearbyUser {
  return {
    id: 'user-2',
    displayName: 'Nearby User',
    avatarUrl: null,
    distanceKm: 3.5,
    latitude: 41.91,
    longitude: 12.5,
    dogs: [
      {
        id: 'dog-2',
        name: 'Bella',
        breed: 'Beagle',
        size: 'media',
        energyLevel: 'high',
        avatarUrl: null,
      },
    ],
    ...overrides,
  };
}

function buildUserDeps(overrides: Partial<typeof userDeps> = {}): typeof userDeps {
  return {
    getProfile: vi.fn().mockResolvedValue(succeed(buildSafeUser())),
    updateLocation: vi.fn().mockResolvedValue(
      succeed({
        latitude: 41.9028,
        longitude: 12.4964,
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
    ),
    updatePreferences: vi.fn().mockResolvedValue(succeed({ searchRadiusKm: 15 })),
    findNearby: vi
      .fn()
      .mockResolvedValue(succeed({ users: [buildNearbyUser()], radius: 10, total: 1 })),
    uploadAvatarUrl: vi
      .fn()
      .mockResolvedValue(
        succeed({ uploadUrl: 'https://upload.url', key: 'avatars/user-1/img.jpg' }),
      ),
    confirmAvatar: vi
      .fn()
      .mockResolvedValue(succeed({ avatarUrl: 'https://cdn.example.com/avatar.jpg' })),
    deleteAvatar: vi.fn().mockResolvedValue(succeed({ message: 'Avatar deleted' })),
    registerPushToken: vi.fn().mockResolvedValue(succeed({ registered: true })),
    updateNotificationPrefs: vi
      .fn()
      .mockResolvedValue(
        succeed({ notificationPrefs: { matches: true, messages: true, reminders: true } }),
      ),
    ...overrides,
  };
}

function createAuthenticatedCaller(deps: typeof userDeps, userId = 'user-1') {
  const appRouter = router({ users: createUsersRouter(deps) });
  return appRouter.createCaller({ userId });
}

function createAnonCaller(deps: typeof userDeps) {
  const appRouter = router({ users: createUsersRouter(deps) });
  return appRouter.createCaller({ userId: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('users router', () => {
  describe('getProfile', () => {
    it('returns user profile for authenticated user', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.getProfile();

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(deps.getProfile).toHaveBeenCalledWith('user-1');
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      const deps = buildUserDeps({
        getProfile: vi
          .fn()
          .mockResolvedValue(fail(new AppError('USER_NOT_FOUND', 'User not found', 404))),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.getProfile()).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.users.getProfile()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('updateLocation', () => {
    it('updates user location', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.updateLocation({
        latitude: 41.9028,
        longitude: 12.4964,
      });

      expect(result.latitude).toBe(41.9028);
      expect(result.longitude).toBe(12.4964);
      expect(deps.updateLocation).toHaveBeenCalledWith('user-1', 41.9028, 12.4964, undefined);
    });

    it('rejects latitude out of range', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.updateLocation({ latitude: 100, longitude: 12 })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.updateLocation).not.toHaveBeenCalled();
    });

    it('rejects longitude out of range', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.updateLocation({ latitude: 41, longitude: 200 })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.updateLocation).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.users.updateLocation({ latitude: 41.9, longitude: 12.5 }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('updatePreferences', () => {
    it('updates search radius', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.updatePreferences({ searchRadiusKm: 15 });

      expect(result.searchRadiusKm).toBe(15);
      expect(deps.updatePreferences).toHaveBeenCalledWith('user-1', 15);
    });

    it('rejects search radius below minimum', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.updatePreferences({ searchRadiusKm: 0 })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.updatePreferences).not.toHaveBeenCalled();
    });

    it('rejects search radius above maximum', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.updatePreferences({ searchRadiusKm: 100 })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.updatePreferences).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.users.updatePreferences({ searchRadiusKm: 15 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('findNearby', () => {
    it('returns nearby users', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.findNearby({});

      expect(result.users).toHaveLength(1);
      expect(result.users[0].displayName).toBe('Nearby User');
      expect(result.radius).toBe(10);
      expect(deps.findNearby).toHaveBeenCalledWith('user-1', {});
    });

    it('passes optional parameters to use case', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await caller.users.findNearby({ radiusKm: 20, limit: 10, offset: 5 });

      expect(deps.findNearby).toHaveBeenCalledWith('user-1', {
        radiusKm: 20,
        limit: 10,
        offset: 5,
      });
    });

    it('throws BAD_REQUEST when location is not set', async () => {
      const deps = buildUserDeps({
        findNearby: vi
          .fn()
          .mockResolvedValue(fail(new AppError('LOCATION_NOT_SET', 'Location not set', 400))),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.findNearby({})).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.users.findNearby({})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects radius below minimum', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.users.findNearby({ radiusKm: 0 })).rejects.toThrow(TRPCError);
      expect(deps.findNearby).not.toHaveBeenCalled();
    });
  });

  describe('uploadAvatarUrl', () => {
    it('returns upload URL for authenticated user', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.uploadAvatarUrl({
        contentType: 'image/jpeg',
        fileSize: 1024,
      });

      expect(result.uploadUrl).toBe('https://upload.url');
      expect(result.key).toBe('avatars/user-1/img.jpg');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.users.uploadAvatarUrl({ contentType: 'image/jpeg', fileSize: 1024 }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('confirmAvatar', () => {
    it('confirms avatar upload', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.confirmAvatar({ key: 'avatars/user-1/img.jpg' });

      expect(result.avatarUrl).toBe('https://cdn.example.com/avatar.jpg');
      expect(deps.confirmAvatar).toHaveBeenCalledWith('user-1', 'avatars/user-1/img.jpg');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.users.confirmAvatar({ key: 'avatars/user-1/img.jpg' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('deleteAvatar', () => {
    it('deletes avatar', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.deleteAvatar();

      expect(result.message).toBe('Avatar deleted');
      expect(deps.deleteAvatar).toHaveBeenCalledWith('user-1');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.users.deleteAvatar()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('updateNotificationPrefs', () => {
    it('updates notification preferences', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.users.updateNotificationPrefs({ matches: false });

      expect(result.notificationPrefs).toEqual({
        matches: true,
        messages: true,
        reminders: true,
      });
      expect(deps.updateNotificationPrefs).toHaveBeenCalledWith('user-1', { matches: false });
    });

    it('accepts partial updates', async () => {
      const deps = buildUserDeps();
      const caller = createAuthenticatedCaller(deps);

      await caller.users.updateNotificationPrefs({ messages: false, reminders: false });

      expect(deps.updateNotificationPrefs).toHaveBeenCalledWith('user-1', {
        messages: false,
        reminders: false,
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildUserDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.users.updateNotificationPrefs({ matches: false })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });
});
