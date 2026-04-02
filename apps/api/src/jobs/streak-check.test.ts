import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';

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
  QUEUE_NAMES: { STREAK_CHECK: 'streak-check' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('../lib/track-event.js', () => ({
  trackEvent: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildGamificationRepo(
  overrides: Partial<GamificationRepository> = {},
): Pick<GamificationRepository, 'findStreaksOlderThan' | 'breakStreak'> {
  return {
    findStreaksOlderThan: vi.fn().mockResolvedValue([]),
    breakStreak: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createStreakCheckWorker', () => {
  let gamificationRepo: ReturnType<typeof buildGamificationRepo>;

  beforeEach(async () => {
    vi.clearAllMocks();
    gamificationRepo = buildGamificationRepo();

    const { createStreakCheckWorker } = await import('./streak-check.js');
    createStreakCheckWorker({
      gamificationRepo: gamificationRepo as unknown as GamificationRepository,
    });
  });

  it('breaks stale streaks and tracks events', async () => {
    const staleStreaks = [
      { id: 'streak-1', userId: 'user-1', currentLength: 5, type: 'daily_walk' },
      { id: 'streak-2', userId: 'user-2', currentLength: 12, type: 'daily_walk' },
    ];
    (gamificationRepo.findStreaksOlderThan as ReturnType<typeof vi.fn>).mockResolvedValue(
      staleStreaks,
    );

    await capturedProcessor();

    expect(gamificationRepo.breakStreak).toHaveBeenCalledTimes(2);
    expect(gamificationRepo.breakStreak).toHaveBeenCalledWith('streak-1');
    expect(gamificationRepo.breakStreak).toHaveBeenCalledWith('streak-2');

    const { trackEvent } = await import('../lib/track-event.js');
    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent).toHaveBeenCalledWith('gamification_streak_broken', 'user-1', {
      streakLength: 5,
      streakType: 'daily_walk',
    });
  });

  it('does nothing when no stale streaks exist', async () => {
    (gamificationRepo.findStreaksOlderThan as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await capturedProcessor();

    expect(gamificationRepo.breakStreak).not.toHaveBeenCalled();
  });

  it('computes yesterday correctly as start-of-day', async () => {
    await capturedProcessor();

    const call = (gamificationRepo.findStreaksOlderThan as ReturnType<typeof vi.fn>).mock.calls[0];
    const passedDate = call[0] as Date;

    expect(passedDate.getHours()).toBe(0);
    expect(passedDate.getMinutes()).toBe(0);
    expect(passedDate.getSeconds()).toBe(0);
    expect(passedDate.getMilliseconds()).toBe(0);

    const now = new Date();
    const expectedDay = new Date(now);
    expectedDay.setDate(expectedDay.getDate() - 1);
    expect(passedDate.getDate()).toBe(expectedDay.getDate());
  });
});
