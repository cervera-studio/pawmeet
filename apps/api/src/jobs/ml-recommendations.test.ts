import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MlRecommendationsRepository,
  NearbyCandidateRow,
  RecommendationUserRow,
} from '../ports/ml-recommendations-repository.js';

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
  QUEUE_NAMES: { ML_RECOMMENDATIONS: 'ml-recommendations' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockPipeline = {
  del: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

vi.mock('../lib/redis.js', () => ({
  redis: {
    pipeline: vi.fn(() => mockPipeline),
  },
}));

vi.mock('../domain/scoring-strategy.js', () => ({
  RuleBasedStrategy: class {
    name = 'rule_based';
    score = vi.fn().mockResolvedValue({ overallScore: 0.75 });
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildUser(overrides: Partial<RecommendationUserRow> = {}): RecommendationUserRow {
  return {
    id: 'user-1',
    latitude: 41.9028,
    longitude: 12.4964,
    searchRadiusKm: 5,
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<NearbyCandidateRow> = {}): NearbyCandidateRow {
  return {
    id: 'dog-candidate',
    ownerId: 'other-user',
    name: 'Rex',
    birthDate: new Date('2021-06-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'large',
    weightKg: 30,
    gender: 'male',
    isNeutered: true,
    energyLevel: 'high',
    behaviorWithDogs: 'friendly',
    behaviorWithPeople: 'friendly',
    leashBehavior: 'good',
    recallReliability: 'good',
    bio: null,
    walkPrefTime: ['morning'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['park'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerLatitude: 41.91,
    ownerLongitude: 12.5,
    distanceKm: 1.5,
    ...overrides,
  };
}

function buildRepo(
  overrides: Partial<MlRecommendationsRepository> = {},
): MlRecommendationsRepository {
  return {
    getActiveUsersWithLocationBatch: vi.fn().mockResolvedValue([]),
    getUserActiveDogs: vi.fn().mockResolvedValue([]),
    getBlockedUserIds: vi.fn().mockResolvedValue([]),
    getBlockerUserIds: vi.fn().mockResolvedValue([]),
    getSwipedDogIds: vi.fn().mockResolvedValue([]),
    getNearbyDogsWithDistance: vi.fn().mockResolvedValue([]),
    ...overrides,
  } satisfies MlRecommendationsRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMlRecommendationsWorker', () => {
  let mlRecommendationsRepo: MlRecommendationsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    mlRecommendationsRepo = buildRepo();

    const { createMlRecommendationsWorker } = await import('./ml-recommendations.js');
    createMlRecommendationsWorker({ mlRecommendationsRepo });
  });

  it('computes and stores recommendations in Redis sorted set', async () => {
    const user = buildUser();
    const userDog = buildCandidate({ id: 'my-dog', ownerId: 'user-1' });
    const candidate = buildCandidate({ id: 'candidate-dog', ownerId: 'other-user' });

    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    (mlRecommendationsRepo.getUserActiveDogs as ReturnType<typeof vi.fn>).mockResolvedValue([
      userDog,
    ]);
    (mlRecommendationsRepo.getNearbyDogsWithDistance as ReturnType<typeof vi.fn>).mockResolvedValue(
      [candidate],
    );

    await capturedProcessor();

    expect(mockPipeline.del).toHaveBeenCalledWith(`ml:recs:${user.id}`);
    expect(mockPipeline.zadd).toHaveBeenCalledWith(`ml:recs:${user.id}`, {
      score: 0.75,
      member: 'candidate-dog',
    });
    expect(mockPipeline.expire).toHaveBeenCalledWith(`ml:recs:${user.id}`, 4 * 60 * 60);
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('filters out blocked users', async () => {
    const user = buildUser();
    const userDog = buildCandidate({ id: 'my-dog', ownerId: 'user-1' });
    const blockedCandidate = buildCandidate({ id: 'blocked-dog', ownerId: 'blocked-user' });

    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    (mlRecommendationsRepo.getUserActiveDogs as ReturnType<typeof vi.fn>).mockResolvedValue([
      userDog,
    ]);
    (mlRecommendationsRepo.getBlockedUserIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      'blocked-user',
    ]);
    (mlRecommendationsRepo.getNearbyDogsWithDistance as ReturnType<typeof vi.fn>).mockResolvedValue(
      [blockedCandidate],
    );

    await capturedProcessor();

    // No zadd called because candidate was blocked
    expect(mockPipeline.zadd).not.toHaveBeenCalled();
  });

  it('filters out already-swiped dogs', async () => {
    const user = buildUser();
    const userDog = buildCandidate({ id: 'my-dog', ownerId: 'user-1' });
    const swipedCandidate = buildCandidate({ id: 'swiped-dog', ownerId: 'other-user' });

    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    (mlRecommendationsRepo.getUserActiveDogs as ReturnType<typeof vi.fn>).mockResolvedValue([
      userDog,
    ]);
    (mlRecommendationsRepo.getSwipedDogIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      'swiped-dog',
    ]);
    (mlRecommendationsRepo.getNearbyDogsWithDistance as ReturnType<typeof vi.fn>).mockResolvedValue(
      [swipedCandidate],
    );

    await capturedProcessor();

    expect(mockPipeline.zadd).not.toHaveBeenCalled();
  });

  it('skips users without dogs', async () => {
    const user = buildUser();
    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);
    (mlRecommendationsRepo.getUserActiveDogs as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await capturedProcessor();

    expect(mlRecommendationsRepo.getNearbyDogsWithDistance).not.toHaveBeenCalled();
  });

  it('skips users without location', async () => {
    const user = buildUser({ latitude: null, longitude: null });
    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user])
      .mockResolvedValueOnce([]);

    await capturedProcessor();

    expect(mlRecommendationsRepo.getUserActiveDogs).not.toHaveBeenCalled();
  });

  it('continues processing remaining users when one fails', async () => {
    const user1 = buildUser({ id: 'user-fail' });
    const user2 = buildUser({ id: 'user-ok' });
    (mlRecommendationsRepo.getActiveUsersWithLocationBatch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([user1, user2])
      .mockResolvedValueOnce([]);
    (mlRecommendationsRepo.getUserActiveDogs as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([buildCandidate({ id: 'my-dog', ownerId: 'user-ok' })]);
    (mlRecommendationsRepo.getNearbyDogsWithDistance as ReturnType<typeof vi.fn>).mockResolvedValue(
      [buildCandidate()],
    );

    await capturedProcessor();

    // user2 still processed
    expect(mlRecommendationsRepo.getUserActiveDogs).toHaveBeenCalledTimes(2);
  });

  it('handles empty database', async () => {
    await capturedProcessor();

    expect(mlRecommendationsRepo.getActiveUsersWithLocationBatch).toHaveBeenCalledTimes(1);
    expect(mockPipeline.exec).not.toHaveBeenCalled();
  });
});
