import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentGuardrailsRepository } from '../ports/experiment-guardrails-repository.js';

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
  moveToAnalyticsDlq: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: { EXPERIMENT_GUARDRAILS: 'experiment-guardrails' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

vi.mock('../lib/track-event.js', () => ({
  trackEvent: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildGuardrailsRepo(
  overrides: Partial<ExperimentGuardrailsRepository> = {},
): ExperimentGuardrailsRepository {
  return {
    getVariantUnmatchRates: vi.fn().mockResolvedValue([
      { variant: 'control', creates: 100, unmatches: 10 },
      { variant: 'treatment', creates: 100, unmatches: 10 },
    ]),
    getVariantFeedEmptyRates: vi.fn().mockResolvedValue([
      { variant: 'control', loaded: 100, exhausted: 5 },
      { variant: 'treatment', loaded: 100, exhausted: 5 },
    ]),
    getVariantRetentionRates: vi.fn().mockResolvedValue([
      { variant: 'control', enrolled_users: 100, active_users: 80 },
      { variant: 'treatment', enrolled_users: 100, active_users: 80 },
    ]),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createExperimentGuardrailsWorker', () => {
  let repo: ReturnType<typeof buildGuardrailsRepo>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    repo = buildGuardrailsRepo();

    const { createExperimentGuardrailsWorker } = await import('./experiment-guardrails.js');
    createExperimentGuardrailsWorker({ experimentGuardrailsRepo: repo });
  });

  it('passes when all metrics are within thresholds', async () => {
    await capturedProcessor();

    expect(mockRedisSet).not.toHaveBeenCalled();
    const { trackEvent } = await import('../lib/track-event.js');
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('skips check when experiment is already killed', async () => {
    mockRedisGet.mockResolvedValue('1');

    await capturedProcessor();

    expect(repo.getVariantUnmatchRates).not.toHaveBeenCalled();
  });

  it('activates kill switch when unmatch rate breaches threshold', async () => {
    (repo.getVariantUnmatchRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', creates: 100, unmatches: 10 },
      { variant: 'treatment', creates: 100, unmatches: 25 }, // 0.25 > 0.10 * 1.2
    ]);

    await capturedProcessor();

    expect(mockRedisSet).toHaveBeenCalledWith('experiment:ai_matching_enabled:kill', '1');
    const { trackEvent } = await import('../lib/track-event.js');
    expect(trackEvent).toHaveBeenCalledWith(
      'experiment_auto_stopped',
      null,
      expect.objectContaining({ metric: 'unmatch_rate' }),
    );
  });

  it('activates kill switch when retention drops below threshold', async () => {
    (repo.getVariantRetentionRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', enrolled_users: 100, active_users: 80 },
      { variant: 'treatment', enrolled_users: 100, active_users: 50 }, // 0.50 < 0.80 * 0.9
    ]);

    await capturedProcessor();

    expect(mockRedisSet).toHaveBeenCalledWith('experiment:ai_matching_enabled:kill', '1');
  });

  it('activates kill switch when feed empty rate is 2x control', async () => {
    (repo.getVariantFeedEmptyRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', loaded: 100, exhausted: 5 },
      { variant: 'treatment', loaded: 100, exhausted: 10 }, // 0.10 >= 0.05 * 2
    ]);

    await capturedProcessor();

    expect(mockRedisSet).toHaveBeenCalledWith('experiment:ai_matching_enabled:kill', '1');
  });

  it('skips when variant data is missing', async () => {
    (repo.getVariantUnmatchRates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (repo.getVariantFeedEmptyRates as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (repo.getVariantRetentionRates as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await capturedProcessor();

    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('does not breach when control values are zero', async () => {
    (repo.getVariantUnmatchRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', creates: 0, unmatches: 0 },
      { variant: 'treatment', creates: 100, unmatches: 50 },
    ]);
    (repo.getVariantFeedEmptyRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', loaded: 0, exhausted: 0 },
      { variant: 'treatment', loaded: 100, exhausted: 50 },
    ]);
    (repo.getVariantRetentionRates as ReturnType<typeof vi.fn>).mockResolvedValue([
      { variant: 'control', enrolled_users: 0, active_users: 0 },
      { variant: 'treatment', enrolled_users: 100, active_users: 50 },
    ]);

    await capturedProcessor();

    expect(mockRedisSet).not.toHaveBeenCalled();
  });
});
