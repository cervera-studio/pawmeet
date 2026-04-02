import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveNearbyUser, NearbyJobRepository } from '../ports/nearby-job-repository.js';

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
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('../constants/notifications.js', () => ({
  NOTIF_NEARBY_SUGGESTION: {
    title: 'Nearby!',
    body: (count: number) => `${count} nearby`,
  },
}));

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildActiveUser(overrides: Partial<ActiveNearbyUser> = {}): ActiveNearbyUser {
  return {
    id: 'user-1',
    displayName: 'Mario',
    latitude: 41.9028,
    longitude: 12.4964,
    searchRadiusKm: 5,
    ...overrides,
  };
}

function buildRepo(overrides: Partial<NearbyJobRepository> = {}): NearbyJobRepository {
  return {
    findActiveUsersWithLocation: vi.fn().mockResolvedValue([]),
    countNearbyUsersWithDogs: vi.fn().mockResolvedValue(0),
    ...overrides,
  } satisfies NearbyJobRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createNearbySuggestionWorker', () => {
  let nearbyJobRepo: NearbyJobRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    nearbyJobRepo = buildRepo();

    // Re-set redis defaults after clearAllMocks
    const { redis } = await import('../lib/redis.js');
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue('OK');

    const { createNearbySuggestionWorker } = await import('./nearby-suggestion.js');
    createNearbySuggestionWorker({ nearbyJobRepo });
  });

  it('sends notification when nearby dogs found and no cooldown', async () => {
    const user = buildActiveUser();
    (nearbyJobRepo.findActiveUsersWithLocation as ReturnType<typeof vi.fn>).mockResolvedValue([
      user,
    ]);
    (nearbyJobRepo.countNearbyUsersWithDogs as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).toHaveBeenCalledWith({
      userId: 'user-1',
      title: 'Nearby!',
      body: '3 nearby',
      data: { type: 'nearby_suggestion' },
    });

    // Cooldown set
    const { redis } = await import('../lib/redis.js');
    expect(redis.set).toHaveBeenCalledWith('nearby-notif:user-1', '1', { ex: 24 * 3600 });
  });

  it('respects 24h cooldown — skips user already notified', async () => {
    const user = buildActiveUser();
    (nearbyJobRepo.findActiveUsersWithLocation as ReturnType<typeof vi.fn>).mockResolvedValue([
      user,
    ]);

    const { redis } = await import('../lib/redis.js');
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue('1');

    await capturedProcessor();

    expect(nearbyJobRepo.countNearbyUsersWithDogs).not.toHaveBeenCalled();
    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('does not notify when no nearby dogs found', async () => {
    const user = buildActiveUser();
    (nearbyJobRepo.findActiveUsersWithLocation as ReturnType<typeof vi.fn>).mockResolvedValue([
      user,
    ]);
    (nearbyJobRepo.countNearbyUsersWithDogs as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('handles no active users gracefully', async () => {
    await capturedProcessor();

    expect(nearbyJobRepo.findActiveUsersWithLocation).toHaveBeenCalledTimes(1);
    const { enqueueNotification } = await import('./queues/index.js');
    expect(enqueueNotification).not.toHaveBeenCalled();
  });

  it('skips users without valid location', async () => {
    // ActiveNearbyUser has non-null lat/lng but the worker checks `!(user.latitude && user.longitude)`
    // Latitude 0 is falsy, so a user at (0, 0) gets skipped
    const userAtNull = buildActiveUser({
      latitude: 0 as unknown as number,
      longitude: 0 as unknown as number,
    });
    (nearbyJobRepo.findActiveUsersWithLocation as ReturnType<typeof vi.fn>).mockResolvedValue([
      userAtNull,
    ]);

    await capturedProcessor();

    expect(nearbyJobRepo.countNearbyUsersWithDogs).not.toHaveBeenCalled();
  });

  it('processes multiple users independently', async () => {
    const user1 = buildActiveUser({ id: 'user-1' });
    const user2 = buildActiveUser({ id: 'user-2' });
    (nearbyJobRepo.findActiveUsersWithLocation as ReturnType<typeof vi.fn>).mockResolvedValue([
      user1,
      user2,
    ]);
    (nearbyJobRepo.countNearbyUsersWithDogs as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    await capturedProcessor();

    const { enqueueNotification } = await import('./queues/index.js');
    // Only user-1 gets notified (user-2 has 0 nearby)
    expect(enqueueNotification).toHaveBeenCalledTimes(1);
    expect(enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });
});
