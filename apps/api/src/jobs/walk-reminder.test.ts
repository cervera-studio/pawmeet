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
    findUpcomingAcceptedWalks: vi.fn().mockResolvedValue([]),
    findOverdueWalks: vi.fn(),
    getMatchDogOwnerIds: vi.fn().mockResolvedValue([]),
    markWalkCompleted: vi.fn(),
    ...overrides,
  } satisfies WalkJobRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createWalkReminderWorker', () => {
  let walkJobRepo: WalkJobRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    walkJobRepo = buildWalkJobRepo();

    const { createWalkReminderWorker } = await import('./walk-reminder.js');
    createWalkReminderWorker({ walkJobRepo });
  });

  it('does nothing when no upcoming walks', async () => {
    await capturedProcessor({});

    expect(mockEnqueueNotification).not.toHaveBeenCalled();
  });

  it('sends reminder to all match owners for upcoming walks', async () => {
    const now = Date.now();
    walkJobRepo = buildWalkJobRepo({
      findUpcomingAcceptedWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'Passeggiata al parco',
          scheduledAt: new Date(now + 60 * 60 * 1000),
          location: 'Parco Sempione',
          createdBy: 'user-1',
          matchId: 'match-1',
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1', 'user-2']),
    });

    const { createWalkReminderWorker } = await import('./walk-reminder.js');
    createWalkReminderWorker({ walkJobRepo });

    await capturedProcessor({});

    expect(mockEnqueueNotification).toHaveBeenCalledTimes(2);
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        data: { type: 'walk_reminder', walkId: 'walk-1' },
      }),
    );
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
      }),
    );
  });

  it('includes location in notification body when available', async () => {
    const now = Date.now();
    walkJobRepo = buildWalkJobRepo({
      findUpcomingAcceptedWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'Giro',
          scheduledAt: new Date(now + 60 * 60 * 1000),
          location: 'Parco Sempione',
          createdBy: 'user-1',
          matchId: 'match-1',
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1']),
    });

    const { createWalkReminderWorker } = await import('./walk-reminder.js');
    createWalkReminderWorker({ walkJobRepo });

    await capturedProcessor({});

    const call = mockEnqueueNotification.mock.calls[0][0] as { body: string };
    expect(call.body).toContain('Parco Sempione');
  });

  it('uses walk title fallback when title is null', async () => {
    const now = Date.now();
    walkJobRepo = buildWalkJobRepo({
      findUpcomingAcceptedWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: null,
          scheduledAt: new Date(now + 15 * 60 * 1000),
          location: null,
          createdBy: 'user-1',
          matchId: 'match-1',
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['user-1']),
    });

    const { createWalkReminderWorker } = await import('./walk-reminder.js');
    createWalkReminderWorker({ walkJobRepo });

    await capturedProcessor({});

    const call = mockEnqueueNotification.mock.calls[0][0] as { body: string };
    expect(call.body).toContain('Passeggiata');
  });

  it('sends reminders for multiple walks', async () => {
    const now = Date.now();
    walkJobRepo = buildWalkJobRepo({
      findUpcomingAcceptedWalks: vi.fn().mockResolvedValue([
        {
          id: 'walk-1',
          title: 'Walk A',
          scheduledAt: new Date(now + 60 * 60 * 1000),
          location: null,
          createdBy: 'user-1',
          matchId: 'match-1',
        },
        {
          id: 'walk-2',
          title: 'Walk B',
          scheduledAt: new Date(now + 15 * 60 * 1000),
          location: null,
          createdBy: 'user-3',
          matchId: 'match-2',
        },
      ]),
      getMatchDogOwnerIds: vi.fn().mockResolvedValue(['owner-1']),
    });

    const { createWalkReminderWorker } = await import('./walk-reminder.js');
    createWalkReminderWorker({ walkJobRepo });

    await capturedProcessor({});

    // 2 walks x 1 owner each = 2 notifications
    expect(mockEnqueueNotification).toHaveBeenCalledTimes(2);
  });
});
