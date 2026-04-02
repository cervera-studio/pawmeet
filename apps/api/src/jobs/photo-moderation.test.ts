import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BreedDetectionService } from '../ports/breed-detection-service.js';
import type { ContentModerationService } from '../ports/content-moderation-service.js';
import type { DogRepository } from '../ports/dog-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { PhotoModerationJobData } from './queues/index.js';

let capturedProcessor: (job: { data: PhotoModerationJobData }) => Promise<void>;

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
  QUEUE_NAMES: { PHOTO_MODERATION: 'photo-moderation' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockHeadObject = vi.fn();
vi.mock('../lib/r2.js', () => ({
  r2: { send: (...args: unknown[]) => mockHeadObject(...args) },
}));

vi.mock('../lib/storage.js', () => ({
  extractKeyFromUrl: (url: string) => url.replace('https://r2.example.com/', ''),
  MAX_FILE_SIZE: 5 * 1024 * 1024,
}));

vi.mock('../constants/notifications.js', () => ({
  NOTIF_PHOTO_REJECTED: {
    title: 'Foto rifiutata',
    body: 'Una delle foto del tuo cane non rispetta le linee guida.',
  },
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildJobData(overrides: Partial<PhotoModerationJobData> = {}): PhotoModerationJobData {
  return {
    photoId: 'photo-1',
    dogId: 'dog-1',
    url: 'https://r2.example.com/dogs/photo.jpg',
    ...overrides,
  } satisfies PhotoModerationJobData;
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    updatePhotoModerationStatus: vi.fn().mockResolvedValue(undefined),
    findPhotoById: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByOwner: vi.fn(),
    findByIds: vi.fn(),
    findByIdAndOwner: vi.fn(),
    countByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findPhotos: vi.fn(),
    countPhotos: vi.fn(),
    addPhoto: vi.fn(),
    findPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoPositions: vi.fn(),
    ...overrides,
  } satisfies DogRepository;
}

function buildNotificationService(
  overrides: Partial<NotificationService> = {},
): NotificationService {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies NotificationService;
}

function buildModerationService(
  overrides: Partial<ContentModerationService> = {},
): ContentModerationService {
  return {
    analyzeImage: vi.fn().mockResolvedValue({ safe: true, categories: [] }),
    ...overrides,
  } satisfies ContentModerationService;
}

function buildBreedDetection(
  overrides: Partial<BreedDetectionService> = {},
): BreedDetectionService {
  return {
    detectBreed: vi.fn().mockResolvedValue({ breeds: [] }),
    ...overrides,
  } satisfies BreedDetectionService;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createPhotoModerationWorker', () => {
  let dogRepo: DogRepository;
  let notificationService: NotificationService;
  let contentModerationService: ContentModerationService;
  let breedDetectionService: BreedDetectionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockHeadObject.mockResolvedValue({ ContentLength: 2048 });
    dogRepo = buildDogRepo();
    notificationService = buildNotificationService();
    contentModerationService = buildModerationService();
    breedDetectionService = buildBreedDetection();

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });
  });

  it('approves photo when AI says safe', async () => {
    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'approved');
  });

  it('rejects photo when R2 file not found', async () => {
    mockHeadObject.mockRejectedValue(new Error('NotFound'));

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'rejected');
  });

  it('rejects photo with zero content length', async () => {
    mockHeadObject.mockResolvedValue({ ContentLength: 0 });

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'rejected');
  });

  it('rejects photo exceeding MAX_FILE_SIZE', async () => {
    mockHeadObject.mockResolvedValue({ ContentLength: 6 * 1024 * 1024 });

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'rejected');
  });

  it('rejects photo when AI flags unsafe content', async () => {
    contentModerationService = buildModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'violence', confidence: 0.9 }],
      }),
    });

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'rejected');
  });

  it('auto-approves when no content moderation service configured', async () => {
    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService: undefined,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'approved');
  });

  it('falls back to approved when AI service throws', async () => {
    contentModerationService = buildModerationService({
      analyzeImage: vi.fn().mockRejectedValue(new Error('AI down')),
    });

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(dogRepo.updatePhotoModerationStatus).toHaveBeenCalledWith('photo-1', 'approved');
  });

  it('triggers breed detection on approved photo', async () => {
    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    // Breed detection is fire-and-forget, give microtask a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(breedDetectionService.detectBreed).toHaveBeenCalledWith(
      'https://r2.example.com/dogs/photo.jpg',
    );
  });

  it('does not trigger breed detection on rejected photo', async () => {
    contentModerationService = buildModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'nudity', confidence: 0.95 }],
      }),
    });
    dogRepo = buildDogRepo({
      findPhotoById: vi.fn().mockResolvedValue({ id: 'photo-1', dogId: 'dog-1' }),
    });

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(breedDetectionService.detectBreed).not.toHaveBeenCalled();
  });

  it('sends rejection notification', async () => {
    contentModerationService = buildModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'nudity', confidence: 0.95 }],
      }),
    });
    dogRepo = buildDogRepo({
      findPhotoById: vi.fn().mockResolvedValue({ id: 'photo-1', dogId: 'dog-1' }),
    });

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Foto rifiutata' }),
    );
  });

  it('does not crash if rejection notification fails', async () => {
    contentModerationService = buildModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'violence', confidence: 0.8 }],
      }),
    });
    dogRepo = buildDogRepo({
      findPhotoById: vi.fn().mockResolvedValue({ id: 'photo-1' }),
    });
    notificationService = buildNotificationService({
      send: vi.fn().mockRejectedValue(new Error('Push down')),
    });

    const { createPhotoModerationWorker } = await import('./photo-moderation.js');
    createPhotoModerationWorker({
      dogRepo,
      notificationService,
      contentModerationService,
      breedDetectionService,
    });

    await expect(capturedProcessor({ data: buildJobData() })).resolves.toBeUndefined();
  });
});
