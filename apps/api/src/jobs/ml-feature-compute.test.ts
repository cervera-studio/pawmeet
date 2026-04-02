import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DogFeatureRow, MlFeatureRepository } from '../ports/ml-feature-repository.js';

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
  QUEUE_NAMES: { ML_FEATURE_COMPUTE: 'ml-feature-compute' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

vi.mock('../lib/redis.js', () => ({
  redis: {
    pipeline: vi.fn(() => mockPipeline),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDogRow(overrides: Partial<DogFeatureRow> = {}): DogFeatureRow {
  return {
    id: `dog-${crypto.randomUUID().slice(0, 8)}`,
    birthDate: new Date('2022-01-15'),
    isNeutered: true,
    size: 'medium',
    energyLevel: 'high',
    behaviorWithDogs: 'friendly',
    leashBehavior: 'good',
    walkPrefTime: ['morning', 'evening'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['park', 'trail'],
    ...overrides,
  };
}

function buildMlFeatureRepo(overrides: Partial<MlFeatureRepository> = {}): MlFeatureRepository {
  return {
    getActiveDogsBatch: vi.fn().mockResolvedValue([]),
    getActiveUserIdsBatch: vi.fn().mockResolvedValue([]),
    getUserSwipeStats: vi.fn().mockResolvedValue({ total: 10, likes: 5 }),
    getUserMatchPrefs: vi.fn().mockResolvedValue({ successRate: 0.6, sampleSize: 8 }),
    getUserAvgMessages: vi.fn().mockResolvedValue(12),
    getUserWalkStats: vi.fn().mockResolvedValue({ total: 20, completed: 15 }),
    ...overrides,
  } satisfies MlFeatureRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMlFeatureComputeWorker', () => {
  let mlFeatureRepo: MlFeatureRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    mlFeatureRepo = buildMlFeatureRepo();

    const { createMlFeatureComputeWorker } = await import('./ml-feature-compute.js');
    createMlFeatureComputeWorker({ mlFeatureRepo });
  });

  it('processes dogs and users and swaps version pointers', async () => {
    const dogs = [buildDogRow({ id: 'dog-1' })];
    const users = [{ id: 'user-1' }];

    (mlFeatureRepo.getActiveDogsBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(dogs)
      .mockResolvedValueOnce([]);
    (mlFeatureRepo.getActiveUserIdsBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(users)
      .mockResolvedValueOnce([]);

    await capturedProcessor();

    // Features written via pipeline
    expect(mockPipeline.set).toHaveBeenCalled();
    expect(mockPipeline.exec).toHaveBeenCalled();

    // Version pointers swapped
    const { redis } = await import('../lib/redis.js');
    expect(redis.set).toHaveBeenCalledWith('ml:features:dog:version', expect.any(String), {
      ex: expect.any(Number),
    });
    expect(redis.set).toHaveBeenCalledWith('ml:features:user:version', expect.any(String), {
      ex: expect.any(Number),
    });
  });

  it('handles empty database gracefully', async () => {
    await capturedProcessor();

    expect(mlFeatureRepo.getActiveDogsBatch).toHaveBeenCalledTimes(1);
    expect(mlFeatureRepo.getActiveUserIdsBatch).toHaveBeenCalledTimes(1);

    // Version pointers still swapped even with no data
    const { redis } = await import('../lib/redis.js');
    expect(redis.set).toHaveBeenCalledTimes(2);
  });

  it('computes user features with zero-division protection', async () => {
    const users = [{ id: 'user-zero' }];
    (mlFeatureRepo.getActiveUserIdsBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(users)
      .mockResolvedValueOnce([]);
    (mlFeatureRepo.getUserSwipeStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 0,
      likes: 0,
    });
    (mlFeatureRepo.getUserMatchPrefs as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mlFeatureRepo.getUserWalkStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      total: 0,
      completed: 0,
    });

    await capturedProcessor();

    // Should complete without errors (division by zero handled)
    expect(mockPipeline.set).toHaveBeenCalled();
    const writtenValue = JSON.parse(mockPipeline.set.mock.calls[0][1] as string);
    expect(writtenValue.likeRate).toBe(0);
    expect(writtenValue.walkCompletionRate).toBe(0);
    expect(writtenValue.matchSuccessRate).toBe(0);
  });

  it('batches dogs correctly with DB_BATCH_SIZE pagination', async () => {
    // Simulate 2 full batches + partial
    const batch500 = Array.from({ length: 500 }, (_, i) => buildDogRow({ id: `dog-${i}` }));
    const batch200 = Array.from({ length: 200 }, (_, i) => buildDogRow({ id: `dog-extra-${i}` }));

    (mlFeatureRepo.getActiveDogsBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(batch500)
      .mockResolvedValueOnce(batch200);

    await capturedProcessor();

    // Called twice for dogs (500 + 200), 200 < 500 so loop breaks
    expect(mlFeatureRepo.getActiveDogsBatch).toHaveBeenCalledTimes(2);
    expect(mlFeatureRepo.getActiveDogsBatch).toHaveBeenNthCalledWith(1, 500, 0);
    expect(mlFeatureRepo.getActiveDogsBatch).toHaveBeenNthCalledWith(2, 500, 500);
  });
});
