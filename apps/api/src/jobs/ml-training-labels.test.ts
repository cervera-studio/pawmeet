import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatureMatchRow, MlTrainingRepository } from '../ports/ml-training-repository.js';

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
  QUEUE_NAMES: { ML_TRAINING_LABELS: 'ml-training-labels' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMatureMatch(overrides: Partial<MatureMatchRow> = {}): MatureMatchRow {
  return {
    match_id: 'match-1',
    dog_a_id: 'dog-a',
    dog_b_id: 'dog-b',
    compatibility_score: 0.85,
    is_active: true,
    match_created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    has_first_message: true,
    has_reply_within_24h: true,
    has_walk_proposed: false,
    has_walk_completed: false,
    avg_feedback_rating: null,
    size_score: 0.9,
    energy_score: 0.8,
    behavior_score: 0.7,
    walk_score: 0.6,
    distance_score: 0.5,
    leash_score: 0.4,
    overall_score: 0.75,
    ...overrides,
  };
}

function buildMlTrainingRepo(overrides: Partial<MlTrainingRepository> = {}): MlTrainingRepository {
  return {
    findMatureMatchesForLabeling: vi.fn().mockResolvedValue([]),
    insertTrainingSamples: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies MlTrainingRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMlTrainingLabelsWorker', () => {
  let mlTrainingRepo: MlTrainingRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    mlTrainingRepo = buildMlTrainingRepo();

    const { createMlTrainingLabelsWorker } = await import('./ml-training-labels.js');
    createMlTrainingLabelsWorker({ mlTrainingRepo });
  });

  it('materializes training labels for mature matches', async () => {
    const match = buildMatureMatch();
    (mlTrainingRepo.findMatureMatchesForLabeling as ReturnType<typeof vi.fn>).mockResolvedValue([
      match,
    ]);

    await capturedProcessor();

    expect(mlTrainingRepo.insertTrainingSamples).toHaveBeenCalledTimes(1);
    const samples = (mlTrainingRepo.insertTrainingSamples as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(samples).toHaveLength(1);
    expect(samples[0].matchId).toBe('match-1');
    expect(samples[0].dogAId).toBe('dog-a');
    expect(samples[0].dogBId).toBe('dog-b');
  });

  it('computes label: first_message + reply = 0.30', async () => {
    const match = buildMatureMatch({
      has_first_message: true,
      has_reply_within_24h: true,
      has_walk_proposed: false,
      has_walk_completed: false,
      avg_feedback_rating: null,
    });
    (mlTrainingRepo.findMatureMatchesForLabeling as ReturnType<typeof vi.fn>).mockResolvedValue([
      match,
    ]);

    await capturedProcessor();

    const samples = (mlTrainingRepo.insertTrainingSamples as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(samples[0].outcomeLabel).toBe(0.3);
  });

  it('computes label: all positive signals = 1.0', async () => {
    const match = buildMatureMatch({
      has_first_message: true,
      has_reply_within_24h: true,
      has_walk_proposed: true,
      has_walk_completed: true,
      avg_feedback_rating: 5,
    });
    (mlTrainingRepo.findMatureMatchesForLabeling as ReturnType<typeof vi.fn>).mockResolvedValue([
      match,
    ]);

    await capturedProcessor();

    const samples = (mlTrainingRepo.insertTrainingSamples as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // 0.15 + 0.15 + 0.20 + 0.30 + 0.20 = 1.0
    expect(samples[0].outcomeLabel).toBe(1.0);
  });

  it('computes label: early unmatch penalty capped at -0.3', async () => {
    const match = buildMatureMatch({
      is_active: false,
      match_created_at: new Date(), // very recent
      has_first_message: false,
      has_reply_within_24h: false,
      has_walk_proposed: false,
      has_walk_completed: false,
      avg_feedback_rating: null,
    });
    (mlTrainingRepo.findMatureMatchesForLabeling as ReturnType<typeof vi.fn>).mockResolvedValue([
      match,
    ]);

    await capturedProcessor();

    const samples = (mlTrainingRepo.insertTrainingSamples as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // 0.0 - 0.3 = -0.3, clamped to -0.3
    expect(samples[0].outcomeLabel).toBe(-0.3);
  });

  it('includes feature vector with breakdown scores', async () => {
    const match = buildMatureMatch();
    (mlTrainingRepo.findMatureMatchesForLabeling as ReturnType<typeof vi.fn>).mockResolvedValue([
      match,
    ]);

    await capturedProcessor();

    const samples = (mlTrainingRepo.insertTrainingSamples as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(samples[0].featureVector).toEqual({
      compatibilityScore: 0.85,
      sizeScore: 0.9,
      energyScore: 0.8,
      behaviorScore: 0.7,
      walkScore: 0.6,
      distanceScore: 0.5,
      leashScore: 0.4,
      overallScore: 0.75,
    });
  });

  it('does nothing when no mature matches exist', async () => {
    await capturedProcessor();

    expect(mlTrainingRepo.insertTrainingSamples).not.toHaveBeenCalled();
  });
});
