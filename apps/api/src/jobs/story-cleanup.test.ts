import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../ports/storage-service.js';
import type { StoryRepository } from '../ports/story-repository.js';

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
  QUEUE_NAMES: { STORY_CLEANUP: 'story-cleanup' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildStoryRepo(
  overrides: Partial<StoryRepository> = {},
): Pick<StoryRepository, 'deleteExpiredStories'> {
  return {
    deleteExpiredStories: vi.fn().mockResolvedValue({ deletedCount: 0, mediaUrls: [] }),
    ...overrides,
  };
}

function buildStorage(
  overrides: Partial<StorageService> = {},
): Pick<StorageService, 'deleteObject' | 'extractKeyFromUrl'> {
  return {
    deleteObject: vi.fn().mockResolvedValue(undefined),
    extractKeyFromUrl: vi.fn((url: string) => url.replace('https://cdn.example.com/', '')),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createStoryCleanupWorker', () => {
  let storyRepo: ReturnType<typeof buildStoryRepo>;
  let storage: ReturnType<typeof buildStorage>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storyRepo = buildStoryRepo();
    storage = buildStorage();

    const { createStoryCleanupWorker } = await import('./story-cleanup.js');
    createStoryCleanupWorker({
      storyRepo: storyRepo as unknown as StoryRepository,
      storage: storage as unknown as StorageService,
    });
  });

  it('deletes expired stories and their R2 objects', async () => {
    (storyRepo.deleteExpiredStories as ReturnType<typeof vi.fn>).mockResolvedValue({
      deletedCount: 2,
      mediaUrls: [
        'https://cdn.example.com/stories/img1.jpg',
        'https://cdn.example.com/stories/img2.jpg',
      ],
    });

    await capturedProcessor();

    expect(storyRepo.deleteExpiredStories).toHaveBeenCalledTimes(1);
    expect(storage.extractKeyFromUrl).toHaveBeenCalledTimes(2);
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(storage.deleteObject).toHaveBeenCalledWith('stories/img1.jpg');
    expect(storage.deleteObject).toHaveBeenCalledWith('stories/img2.jpg');
  });

  it('handles no expired stories gracefully', async () => {
    await capturedProcessor();

    expect(storyRepo.deleteExpiredStories).toHaveBeenCalledTimes(1);
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('continues deleting remaining objects when one R2 deletion fails', async () => {
    (storyRepo.deleteExpiredStories as ReturnType<typeof vi.fn>).mockResolvedValue({
      deletedCount: 2,
      mediaUrls: [
        'https://cdn.example.com/stories/img1.jpg',
        'https://cdn.example.com/stories/img2.jpg',
      ],
    });
    (storage.deleteObject as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('R2 timeout'))
      .mockResolvedValueOnce(undefined);

    await capturedProcessor();

    // Both objects attempted
    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    // Second object still deleted successfully
    expect(storage.deleteObject).toHaveBeenNthCalledWith(2, 'stories/img2.jpg');
  });

  it('does not throw when R2 deletion fails', async () => {
    (storyRepo.deleteExpiredStories as ReturnType<typeof vi.fn>).mockResolvedValue({
      deletedCount: 1,
      mediaUrls: ['https://cdn.example.com/stories/broken.jpg'],
    });
    (storage.deleteObject as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('R2 error'));

    await expect(capturedProcessor()).resolves.toBeUndefined();
  });
});
