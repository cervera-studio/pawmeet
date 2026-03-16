import { vi } from 'vitest';

/**
 * Global mock for Upstash Redis — prevents real HTTP connections during tests.
 * Individual tests can override with their own vi.mock() if needed.
 */
vi.mock('../lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    pipeline: vi.fn().mockReturnValue({
      exists: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  },
}));
