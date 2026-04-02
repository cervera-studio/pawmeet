import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RisingCompatibilityRepository } from '../ports/rising-compatibility-repository.js';

let capturedProcessor: () => Promise<void>;

vi.mock('bullmq', () => {
  const WorkerMock = function (
    this: { on: ReturnType<typeof vi.fn> },
    _name: string,
    processor: typeof capturedProcessor,
  ) {
    capturedProcessor = processor;
    this.on = vi.fn();
  };
  return { Worker: WorkerMock };
});

vi.mock('./queues/index.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  enqueueNotification: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: { RISING_COMPATIBILITY: 'rising-compatibility' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../lib/track-event.js', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('../constants/notifications.js', () => ({
  NOTIF_RISING_COMPATIBILITY: {
    title: 'Rising!',
    body: (count: number) => `${count} rising matches`,
  },
}));

const mockPipeline = {
  del: vi.fn().mockReturnThis(),
  hset: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

vi.mock('../lib/redis.js', () => ({
  redis: {
    zrange: vi.fn().mockResolvedValue([]),
    hgetall: vi.fn().mockResolvedValue(null),
    pipeline: vi.fn(() => mockPipeline),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildRepo(
  overrides: Partial<RisingCompatibilityRepository> = {},
): RisingCompatibilityRepository {
  return {
    getActiveUsersWithLocationBatch: vi.fn().mockResolvedValue([]),
    ...overrides,
  } satisfies RisingCompatibilityRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createRisingCompatibilityWorker', () => {
  let risingCompatibilityRepo: RisingCompatibilityRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    risingCompatibilityRepo = buildRepo();

    const { createRisingCompatibilityWorker } = await import('./rising-compatibility.js');
    createRisingCompatibilityWorker({ risingCompatibilityRepo });
  });

  it('sends notification when compatibility rises >15%', async () => {
    (risingCompatibilityRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);

    const { redis } = await import('../lib/redis.js');
    // Current recs: dog-a has score 0.8
    (redis.zrange as ReturnType<typeof vi.fn>).mockResolvedValue(['dog-a', 0.8]);
    // Previous score was 0.5 => improvement = (0.8-0.5)/0.5 = 0.6 > 0.15
    (redis.hgetall as ReturnType<typeof vi.fn>).mockResolvedValue({ 'dog-a': '0.5' });

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Rising!',
      body: '1 rising matches',
      data: { type: 'nearby_suggestion' },
    });

    const { trackEvent } = await import('../lib/track-event.js');
    expect(trackEvent).toHaveBeenCalledWith('rising_compatibility_notified', 'user-1', {
      risingCount: 1,
    });
  });

  it('does not notify when improvement is below threshold', async () => {
    (risingCompatibilityRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);

    const { redis } = await import('../lib/redis.js');
    // Current score 0.55, previous 0.50 => improvement = 10% < 15%
    (redis.zrange as ReturnType<typeof vi.fn>).mockResolvedValue(['dog-a', 0.55]);
    (redis.hgetall as ReturnType<typeof vi.fn>).mockResolvedValue({ 'dog-a': '0.50' });

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('saves current scores as previous for next run', async () => {
    (risingCompatibilityRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);

    const { redis } = await import('../lib/redis.js');
    (redis.zrange as ReturnType<typeof vi.fn>).mockResolvedValue(['dog-a', 0.7]);
    (redis.hgetall as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await capturedProcessor();

    expect(mockPipeline.del).toHaveBeenCalledWith('ml:rising:prev:user-1');
    expect(mockPipeline.hset).toHaveBeenCalledWith('ml:rising:prev:user-1', { 'dog-a': '0.7' });
    expect(mockPipeline.expire).toHaveBeenCalledWith('ml:rising:prev:user-1', 48 * 60 * 60);
  });

  it('skips user with no current recs', async () => {
    (risingCompatibilityRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);

    const { redis } = await import('../lib/redis.js');
    (redis.zrange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('handles empty database', async () => {
    await capturedProcessor();

    expect(risingCompatibilityRepo.getActiveUsersWithLocationBatch).toHaveBeenCalledTimes(1);
  });

  it('continues when individual user processing fails', async () => {
    (risingCompatibilityRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 'user-fail' }, { id: 'user-ok' }])
      .mockResolvedValueOnce([]);

    const { redis } = await import('../lib/redis.js');
    (redis.zrange as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Redis down'))
      .mockResolvedValueOnce([]);

    // Should not throw — errors caught per-user
    await expect(capturedProcessor()).resolves.toBeUndefined();
  });
});
