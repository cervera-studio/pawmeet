import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('./redis.js', () => ({
  redis: {
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    exists: vi.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    pipeline: vi.fn(() => {
      const commands: Array<() => unknown> = [];
      return {
        exists: (key: string) => {
          commands.push(() => (store.has(key) ? 1 : 0));
        },
        exec: async () => commands.map((cmd) => cmd()),
      };
    }),
  },
}));

describe('user-presence', () => {
  let mod: Awaited<typeof import('./user-presence.js')>;

  beforeEach(async () => {
    store.clear();
    vi.resetModules();
    mod = await import('./user-presence.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('markUserActive', () => {
    it('sets a presence key in Redis', async () => {
      await mod.markUserActive('user-1');
      expect(store.has('user:active:user-1')).toBe(true);
    });
  });

  describe('isUserActive', () => {
    it('returns true when user is active', async () => {
      await mod.markUserActive('user-1');
      expect(await mod.isUserActive('user-1')).toBe(true);
    });

    it('returns false when user is not active', async () => {
      expect(await mod.isUserActive('user-999')).toBe(false);
    });
  });

  describe('countActiveUsers', () => {
    it('returns 0 for empty array', async () => {
      expect(await mod.countActiveUsers([])).toBe(0);
    });

    it('counts only active users', async () => {
      await mod.markUserActive('user-1');
      await mod.markUserActive('user-3');

      const count = await mod.countActiveUsers(['user-1', 'user-2', 'user-3']);
      expect(count).toBe(2);
    });
  });

  describe('getActiveStatuses', () => {
    it('returns empty map for empty array', async () => {
      const result = await mod.getActiveStatuses([]);
      expect(result.size).toBe(0);
    });

    it('returns correct active/inactive statuses', async () => {
      await mod.markUserActive('user-a');

      const result = await mod.getActiveStatuses(['user-a', 'user-b']);
      expect(result.get('user-a')).toBe(true);
      expect(result.get('user-b')).toBe(false);
    });
  });
});
