import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GpsRetentionRepository } from '../ports/gps-retention-repository.js';

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
  QUEUE_NAMES: { GPS_RETENTION: 'gps-retention' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildGpsRetentionRepo(
  overrides: Partial<GpsRetentionRepository> = {},
): GpsRetentionRepository {
  return {
    purgeOldTrackPoints: vi.fn().mockResolvedValue(undefined),
    purgeOldSafetyCheckins: vi.fn().mockResolvedValue(undefined),
    clearStaleUserLocations: vi.fn().mockResolvedValue(undefined),
    purgeOldNotifications: vi.fn().mockResolvedValue(undefined),
    purgeOldAuditLogs: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createGpsRetentionWorker', () => {
  let repo: ReturnType<typeof buildGpsRetentionRepo>;

  beforeEach(async () => {
    vi.clearAllMocks();
    repo = buildGpsRetentionRepo();

    const { createGpsRetentionWorker } = await import('./gps-retention.js');
    createGpsRetentionWorker({ gpsRetentionRepo: repo });
  });

  it('purges all retention categories with correct retention days', async () => {
    await capturedProcessor();

    expect(repo.purgeOldTrackPoints).toHaveBeenCalledWith(90);
    expect(repo.purgeOldSafetyCheckins).toHaveBeenCalledWith(90);
    expect(repo.clearStaleUserLocations).toHaveBeenCalledWith(90);
    expect(repo.purgeOldNotifications).toHaveBeenCalledWith(90);
    expect(repo.purgeOldAuditLogs).toHaveBeenCalledWith(730);
  });

  it('calls all purge methods exactly once', async () => {
    await capturedProcessor();

    expect(repo.purgeOldTrackPoints).toHaveBeenCalledTimes(1);
    expect(repo.purgeOldSafetyCheckins).toHaveBeenCalledTimes(1);
    expect(repo.clearStaleUserLocations).toHaveBeenCalledTimes(1);
    expect(repo.purgeOldNotifications).toHaveBeenCalledTimes(1);
    expect(repo.purgeOldAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from any purge operation', async () => {
    (repo.purgeOldTrackPoints as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

    await expect(capturedProcessor()).rejects.toThrow('DB error');
  });

  it('stops execution when an early purge fails (no partial completion)', async () => {
    (repo.purgeOldTrackPoints as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

    await expect(capturedProcessor()).rejects.toThrow('timeout');

    // Subsequent purges should not have been called
    expect(repo.purgeOldSafetyCheckins).not.toHaveBeenCalled();
  });
});
