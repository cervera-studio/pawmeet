import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ActivityWindowRow,
  MlOptimalTimesRepository,
  NearbyActivityRow,
  UserLocationRow,
} from '../ports/ml-optimal-times-repository.js';

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
  QUEUE_NAMES: { ML_OPTIMAL_TIMES: 'ml-optimal-times' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../lib/redis.js', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildUserLocation(overrides: Partial<UserLocationRow> = {}): UserLocationRow {
  return {
    id: 'user-1',
    latitude: 41.9028,
    longitude: 12.4964,
    searchRadiusKm: 5,
    ...overrides,
  };
}

function buildActivityWindow(overrides: Partial<ActivityWindowRow> = {}): ActivityWindowRow {
  return {
    dayOfWeek: 1,
    hourOfDay: 9,
    activityCount: 5,
    ...overrides,
  };
}

function buildNearbyActivity(overrides: Partial<NearbyActivityRow> = {}): NearbyActivityRow {
  return {
    dayOfWeek: 1,
    hourOfDay: 9,
    totalActivity: 20,
    userCount: 8,
    ...overrides,
  };
}

function buildRepo(overrides: Partial<MlOptimalTimesRepository> = {}): MlOptimalTimesRepository {
  return {
    getActiveUsersWithLocationBatch: vi.fn().mockResolvedValue([]),
    getUserActivityWindows: vi.fn().mockResolvedValue([]),
    getNearbyActivityWindows: vi.fn().mockResolvedValue([]),
    ...overrides,
  } satisfies MlOptimalTimesRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMlOptimalTimesWorker', () => {
  let mlOptimalTimesRepo: MlOptimalTimesRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    mlOptimalTimesRepo = buildRepo();

    const { createMlOptimalTimesWorker } = await import('./ml-optimal-times.js');
    createMlOptimalTimesWorker({ mlOptimalTimesRepo });
  });

  it('computes optimal times and stores in Redis', async () => {
    const user = buildUserLocation();
    (mlOptimalTimesRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);

    const ownWindows = [
      buildActivityWindow({ dayOfWeek: 1, hourOfDay: 9, activityCount: 5 }),
      buildActivityWindow({ dayOfWeek: 1, hourOfDay: 18, activityCount: 3 }),
    ];
    (mlOptimalTimesRepo.getUserActivityWindows as ReturnType<typeof vi.fn>).mockResolvedValue(
      ownWindows,
    );

    const nearbyActivity = [
      buildNearbyActivity({ dayOfWeek: 1, hourOfDay: 9, totalActivity: 20, userCount: 8 }),
      buildNearbyActivity({ dayOfWeek: 1, hourOfDay: 18, totalActivity: 10, userCount: 4 }),
    ];
    (mlOptimalTimesRepo.getNearbyActivityWindows as ReturnType<typeof vi.fn>).mockResolvedValue(
      nearbyActivity,
    );

    await capturedProcessor();

    const { redis } = await import('../lib/redis.js');
    expect(redis.set).toHaveBeenCalledWith(`ml:optimal-times:${user.id}`, expect.any(String), {
      ex: 25 * 60 * 60,
    });

    const storedData = JSON.parse(
      (redis.set as ReturnType<typeof vi.fn>).mock.calls[0][1] as string,
    );
    expect(storedData).toHaveLength(2);
    // Highest score first (5 * 20 = 100 > 3 * 10 = 30)
    expect(storedData[0].dayOfWeek).toBe(1);
    expect(storedData[0].hourStart).toBe(9);
    expect(storedData[0].score).toBe(1); // normalized max
  });

  it('skips users without location', async () => {
    const userNoLocation = buildUserLocation({ latitude: null, longitude: null });
    (mlOptimalTimesRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([userNoLocation])
      .mockResolvedValueOnce([]);

    await capturedProcessor();

    expect(mlOptimalTimesRepo.getUserActivityWindows).not.toHaveBeenCalled();
  });

  it('handles empty active users gracefully', async () => {
    await capturedProcessor();

    expect(mlOptimalTimesRepo.getActiveUsersWithLocationBatch).toHaveBeenCalledTimes(1);
    expect(mlOptimalTimesRepo.getUserActivityWindows).not.toHaveBeenCalled();
  });

  it('skips user when own activity windows are empty', async () => {
    const user = buildUserLocation();
    (mlOptimalTimesRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    (mlOptimalTimesRepo.getUserActivityWindows as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await capturedProcessor();

    expect(mlOptimalTimesRepo.getNearbyActivityWindows).not.toHaveBeenCalled();
    const { redis } = await import('../lib/redis.js');
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('continues processing remaining users when one fails', async () => {
    const user1 = buildUserLocation({ id: 'user-fail' });
    const user2 = buildUserLocation({ id: 'user-ok' });
    (mlOptimalTimesRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user1, user2])
      .mockResolvedValueOnce([]);

    (mlOptimalTimesRepo.getUserActivityWindows as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('DB timeout'))
      .mockResolvedValueOnce([buildActivityWindow()]);

    (mlOptimalTimesRepo.getNearbyActivityWindows as ReturnType<typeof vi.fn>).mockResolvedValue([
      buildNearbyActivity(),
    ]);

    await capturedProcessor();

    // user2 still processed despite user1 failure
    expect(mlOptimalTimesRepo.getUserActivityWindows).toHaveBeenCalledTimes(2);
  });
});
