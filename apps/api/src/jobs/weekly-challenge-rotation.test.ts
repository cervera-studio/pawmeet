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
  QUEUE_NAMES: { WEEKLY_CHALLENGES: 'weekly-challenges' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const mockCreateWeeklyChallenges = vi.fn();

vi.mock('../use-cases/create-weekly-challenges.js', () => ({
  createCreateWeeklyChallenges: () => mockCreateWeeklyChallenges,
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createWeeklyChallengeRotationWorker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreateWeeklyChallenges.mockResolvedValue({
      success: true,
      data: { challenges: [{ id: 'c1' }, { id: 'c2' }] },
    });

    const { createWeeklyChallengeRotationWorker } = await import('./weekly-challenge-rotation.js');
    createWeeklyChallengeRotationWorker({
      gamificationRepo: {} as unknown as GamificationRepository,
    });
  });

  it('creates weekly challenges successfully', async () => {
    await capturedProcessor();

    expect(mockCreateWeeklyChallenges).toHaveBeenCalledTimes(1);
  });

  it('handles use case returning failure without throwing', async () => {
    mockCreateWeeklyChallenges.mockResolvedValue({
      success: false,
      error: new Error('no templates'),
    });

    // The worker does not check result.success for throwing — it just logs on success
    await expect(capturedProcessor()).resolves.toBeUndefined();
  });

  it('propagates unexpected errors from the use case', async () => {
    mockCreateWeeklyChallenges.mockRejectedValue(new Error('DB connection failed'));

    await expect(capturedProcessor()).rejects.toThrow('DB connection failed');
  });
});
