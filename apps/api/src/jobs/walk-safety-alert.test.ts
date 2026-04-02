import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalkJobRepository } from '../ports/walk-job-repository.js';

let capturedProcessor: (job: unknown) => Promise<void>;

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

const mockEnqueueNotification = vi.fn().mockResolvedValue(undefined);
vi.mock('./queues/index.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  enqueueNotification: (...args: unknown[]) => mockEnqueueNotification(...args),
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildWalkJobRepo(overrides: Partial<WalkJobRepository> = {}): WalkJobRepository {
  return {
    findUpcomingAcceptedWalks: vi.fn(),
    findOverdueWalks: vi.fn().mockResolvedValue([]),
    getMatchDogOwnerIds: vi.fn().mockResolvedValue([]),
    markWalkCompleted: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies WalkJobRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createWalkSafetyAlertWorker', () => {
  let walkJobRepo: WalkJobRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    walkJobRepo = buildWalkJobRepo();

    const { createWalkSafetyAlertWorker } = await import('./walk-safety-alert.js');
    createWalkSafetyAlertWorker({ walkJobRepo });
  });

  it('does nothing when no overdue walks', async () => {
    await capturedProcessor({});

    expect(mockEnqueueNotification).not.toHaveBeenCalled();
    expect(walkJobRepo.markWalkCompleted).not.toHaveBeenCalled();
  });

  it('sends safety alert to all match owners for overdue walk', async () => {
    walkJobRepo = buildWalkJobRepo({
      findOverdueWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'Passeggiata serale',
          matchId: 'match-1',
          createdBy: 'user-1',
          scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          durationMin: 30,
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1', 'user-2']),
    });

    const { createWalkSafetyAlertWorker } = await import('./walk-safety-alert.js');
    createWalkSafetyAlertWorker({ walkJobRepo });

    await capturedProcessor({});

    expect(mockEnqueueNotification).toHaveBeenCalledTimes(2);
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        data: { type: 'walk_overdue', walkId: 'walk-1' },
      }),
    );
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
      }),
    );
  });

  it('marks overdue walk as completed to avoid repeated alerts', async () => {
    walkJobRepo = buildWalkJobRepo({
      findOverdueWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'Walk',
          matchId: 'match-1',
          createdBy: 'user-1',
          scheduledAt: new Date(),
          durationMin: 30,
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1']),
    });

    const { createWalkSafetyAlertWorker } = await import('./walk-safety-alert.js');
    createWalkSafetyAlertWorker({ walkJobRepo });

    await capturedProcessor({});

    expect(walkJobRepo.markWalkCompleted).toHaveBeenCalledWith('walk-1', expect.any(Date));
  });

  it('uses fallback title when walk title is null', async () => {
    walkJobRepo = buildWalkJobRepo({
      findOverdueWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: null,
          matchId: 'match-1',
          createdBy: 'user-1',
          scheduledAt: new Date(),
          durationMin: 30,
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1']),
    });

    const { createWalkSafetyAlertWorker } = await import('./walk-safety-alert.js');
    createWalkSafetyAlertWorker({ walkJobRepo });

    await capturedProcessor({});

    const call = mockEnqueueNotification.mock.calls[0][0] as { body: string };
    expect(call.body).toContain('Passeggiata');
  });

  it('processes multiple overdue walks', async () => {
    walkJobRepo = buildWalkJobRepo({
      findOverdueWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'A',
          matchId: 'match-1',
          createdBy: 'user-1',
          scheduledAt: new Date(),
          durationMin: 30,
        },
        {
          id: 'walk-2',
          title: 'B',
          matchId: 'match-2',
          createdBy: 'user-3',
          scheduledAt: new Date(),
          durationMin: 45,
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['owner-1']),
    });

    const { createWalkSafetyAlertWorker } = await import('./walk-safety-alert.js');
    createWalkSafetyAlertWorker({ walkJobRepo });

    await capturedProcessor({});

    // 2 walks x 1 owner each = 2 notifications + 2 markCompleted
    expect(mockEnqueueNotification).toHaveBeenCalledTimes(2);
    expect(walkJobRepo.markWalkCompleted).toHaveBeenCalledTimes(2);
  });
});
