import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExperimentMetricsJobRepository } from '../ports/experiment-metrics-job-repository.js';

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
  QUEUE_NAMES: { EXPERIMENT_METRICS: 'experiment-metrics' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildExperimentMetricsRepo(
  overrides: Partial<ExperimentMetricsJobRepository> = {},
): Pick<
  ExperimentMetricsJobRepository,
  | 'getPredictionStatsForDay'
  | 'getScoreBucketsForDay'
  | 'getWeightDistribution'
  | 'getSuccessRateDistribution'
  | 'upsertModelPerformance'
> {
  return {
    getPredictionStatsForDay: vi
      .fn()
      .mockResolvedValue({ totalPredictions: 150, avgOverallScore: 0.72 }),
    getScoreBucketsForDay: vi.fn().mockResolvedValue([{ bucket: '0.7-0.8', swipes: 50 }]),
    getWeightDistribution: vi.fn().mockResolvedValue([{ dimension: 'size', avgWeight: 0.25 }]),
    getSuccessRateDistribution: vi.fn().mockResolvedValue([{ bucket: '0.5-0.6', count: 30 }]),
    upsertModelPerformance: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createExperimentMetricsWorker', () => {
  let repo: ReturnType<typeof buildExperimentMetricsRepo>;

  beforeEach(async () => {
    vi.clearAllMocks();
    repo = buildExperimentMetricsRepo();

    const { createExperimentMetricsWorker } = await import('./experiment-metrics.js');
    createExperimentMetricsWorker({
      experimentMetricsJobRepo: repo as unknown as ExperimentMetricsJobRepository,
    });
  });

  it('computes model performance and upserts for yesterday', async () => {
    await capturedProcessor();

    expect(repo.getPredictionStatsForDay).toHaveBeenCalledTimes(1);
    expect(repo.getScoreBucketsForDay).toHaveBeenCalledTimes(1);
    expect(repo.getWeightDistribution).toHaveBeenCalledTimes(1);
    expect(repo.getSuccessRateDistribution).toHaveBeenCalledTimes(1);
    expect(repo.upsertModelPerformance).toHaveBeenCalledTimes(1);

    const call = (repo.upsertModelPerformance as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.totalPredictions).toBe(150);
    expect(call.avgOverallScore).toBe(0.72);
    expect(call.totalMatches).toBe(0);
  });

  it('passes correct date range (yesterday 00:00 to today 00:00 UTC)', async () => {
    await capturedProcessor();

    const [dayStart, nextDayStart] = (repo.getPredictionStatsForDay as ReturnType<typeof vi.fn>)
      .mock.calls[0] as [Date, Date];

    expect(dayStart.getUTCHours()).toBe(0);
    expect(dayStart.getUTCMinutes()).toBe(0);
    expect(nextDayStart.getTime() - dayStart.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('handles null prediction stats gracefully', async () => {
    (repo.getPredictionStatsForDay as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await capturedProcessor();

    const call = (repo.upsertModelPerformance as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.totalPredictions).toBe(0);
    expect(call.avgOverallScore).toBeNull();
  });

  it('propagates errors from repository calls', async () => {
    (repo.getPredictionStatsForDay as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('DB timeout'),
    );

    await expect(capturedProcessor()).rejects.toThrow('DB timeout');
  });
});
