import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  getEventStatusQueue: vi.fn(),
  QUEUE_NAMES: { EVENT_STATUS: 'event-status' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockTransitionStatuses = vi.fn();

vi.mock('../use-cases/transition-event-statuses.js', () => ({
  createTransitionEventStatuses: () => mockTransitionStatuses,
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createEventStatusWorker', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockTransitionStatuses.mockResolvedValue({
      success: true,
      data: { startedCount: 0, completedCount: 0 },
    });

    const { createEventStatusWorker } = await import('./event-status.js');
    createEventStatusWorker({
      groupEventRepo: {} as never,
      notificationService: {} as never,
      badgeRepo: {} as never,
    });
  });

  it('calls transitionStatuses and succeeds', async () => {
    mockTransitionStatuses.mockResolvedValue({
      success: true,
      data: { startedCount: 2, completedCount: 1 },
    });

    await capturedProcessor();

    expect(mockTransitionStatuses).toHaveBeenCalledTimes(1);
  });

  it('throws when transitionStatuses returns failure', async () => {
    const error = new Error('transition failed');
    mockTransitionStatuses.mockResolvedValue({
      success: false,
      error,
    });

    await expect(capturedProcessor()).rejects.toThrow('transition failed');
  });

  it('propagates unexpected errors from the use case', async () => {
    mockTransitionStatuses.mockRejectedValue(new Error('DB connection lost'));

    await expect(capturedProcessor()).rejects.toThrow('DB connection lost');
  });
});
