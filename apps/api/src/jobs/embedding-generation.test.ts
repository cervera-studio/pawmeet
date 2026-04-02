import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DogRepository } from '../ports/dog-repository.js';
import type { EmbeddingRepository } from '../ports/embedding-repository.js';
import type { EmbeddingService } from '../ports/embedding-service.js';

let capturedProcessor: (job: { data: unknown }) => Promise<void>;

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
  QUEUE_NAMES: { EMBEDDING_GENERATION: 'embedding-generation' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const MOCK_EMBEDDING = [0.1, 0.2, 0.3];
const MOCK_DOG = { id: 'dog-1', isActive: true, name: 'Rex' };

function buildDogRepo(overrides: Partial<DogRepository> = {}): Pick<DogRepository, 'findById'> {
  return {
    findById: vi.fn().mockResolvedValue(MOCK_DOG),
    ...overrides,
  };
}

function buildEmbeddingRepo(
  overrides: Partial<EmbeddingRepository> = {},
): Pick<EmbeddingRepository, 'upsert'> {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildEmbeddingService(overrides: Partial<EmbeddingService> = {}): EmbeddingService {
  return {
    modelVersion: 'v1.0',
    encode: vi.fn().mockReturnValue(MOCK_EMBEDDING),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createEmbeddingGenerationWorker', () => {
  let dogRepo: ReturnType<typeof buildDogRepo>;
  let embeddingRepo: ReturnType<typeof buildEmbeddingRepo>;
  let embeddingService: ReturnType<typeof buildEmbeddingService>;

  beforeEach(async () => {
    vi.clearAllMocks();
    dogRepo = buildDogRepo();
    embeddingRepo = buildEmbeddingRepo();
    embeddingService = buildEmbeddingService();

    const { createEmbeddingGenerationWorker } = await import('./embedding-generation.js');
    createEmbeddingGenerationWorker({
      dogRepo: dogRepo as unknown as DogRepository,
      embeddingRepo: embeddingRepo as unknown as EmbeddingRepository,
      embeddingService,
    });
  });

  it('generates and upserts embedding for an active dog', async () => {
    await capturedProcessor({ data: { dogId: 'dog-1', trigger: 'create' } });

    expect(dogRepo.findById).toHaveBeenCalledWith('dog-1');
    expect(embeddingService.encode).toHaveBeenCalledWith(MOCK_DOG);
    expect(embeddingRepo.upsert).toHaveBeenCalledWith('dog-1', MOCK_EMBEDDING, 'v1.0');
  });

  it('skips when dog is not found', async () => {
    (dogRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await capturedProcessor({ data: { dogId: 'gone', trigger: 'update' } });

    expect(embeddingService.encode).not.toHaveBeenCalled();
    expect(embeddingRepo.upsert).not.toHaveBeenCalled();
  });

  it('skips when dog is inactive', async () => {
    (dogRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_DOG,
      isActive: false,
    });

    await capturedProcessor({ data: { dogId: 'dog-1', trigger: 'update' } });

    expect(embeddingService.encode).not.toHaveBeenCalled();
    expect(embeddingRepo.upsert).not.toHaveBeenCalled();
  });

  it('propagates errors from embeddingRepo.upsert', async () => {
    (embeddingRepo.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

    await expect(
      capturedProcessor({ data: { dogId: 'dog-1', trigger: 'create' } }),
    ).rejects.toThrow('DB error');
  });
});
