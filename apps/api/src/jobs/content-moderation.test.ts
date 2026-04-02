import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentModerationService } from '../ports/content-moderation-service.js';
import type { FeedRepository } from '../ports/feed-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { ContentModerationJobData } from './queues/index.js';

// Capture the processor function passed to the BullMQ Worker constructor
let capturedProcessor: (job: { data: ContentModerationJobData }) => Promise<void>;

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
  QUEUE_NAMES: { CONTENT_MODERATION: 'content-moderation' },
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
  MAX_VIDEO_FILE_SIZE: 100 * 1024 * 1024,
}));

vi.mock('../constants/notifications.js', () => ({
  NOTIF_CONTENT_REJECTED: {
    title: 'Contenuto rifiutato',
    body: 'Uno dei tuoi contenuti non rispetta le linee guida.',
  },
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildJobData(overrides: Partial<ContentModerationJobData> = {}): ContentModerationJobData {
  return {
    mediaId: 'media-1',
    postId: 'post-1',
    url: 'https://r2.example.com/photos/test.jpg',
    mediaType: 'photo',
    ...overrides,
  } satisfies ContentModerationJobData;
}

function buildFeedRepo(overrides: Partial<FeedRepository> = {}): FeedRepository {
  return {
    updateMediaModerationStatus: vi.fn().mockResolvedValue(undefined),
    findMediaByPost: vi.fn().mockResolvedValue([]),
    findPostById: vi.fn().mockResolvedValue(null),
    // Unused methods stubbed as vi.fn()
    createPost: vi.fn(),
    findPostWithAuthor: vi.fn(),
    softDeletePost: vi.fn(),
    getFeedForUser: vi.fn(),
    getUserPosts: vi.fn(),
    getConnectedUserIds: vi.fn(),
    addMedia: vi.fn(),
    countMediaByPost: vi.fn(),
    addLike: vi.fn(),
    removeLike: vi.fn(),
    hasLiked: vi.fn(),
    addComment: vi.fn(),
    findCommentById: vi.fn(),
    softDeleteComment: vi.fn(),
    getComments: vi.fn(),
    addTags: vi.fn(),
    removeTags: vi.fn(),
    getResolvedTags: vi.fn(),
    findTagById: vi.fn(),
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    searchPostsByHashtag: vi.fn(),
    getTrendingHashtags: vi.fn(),
    ...overrides,
  } satisfies FeedRepository;
}

function buildNotificationService(
  overrides: Partial<NotificationService> = {},
): NotificationService {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies NotificationService;
}

function buildContentModerationService(
  overrides: Partial<ContentModerationService> = {},
): ContentModerationService {
  return {
    analyzeImage: vi.fn().mockResolvedValue({ safe: true, categories: [] }),
    ...overrides,
  } satisfies ContentModerationService;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createContentModerationWorker', () => {
  let feedRepo: FeedRepository;
  let notificationService: NotificationService;
  let contentModerationService: ContentModerationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockHeadObject.mockResolvedValue({ ContentLength: 1024 });
    feedRepo = buildFeedRepo();
    notificationService = buildNotificationService();
    contentModerationService = buildContentModerationService();

    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService,
    });
  });

  it('approves photo when AI says safe', async () => {
    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'approved');
  });

  it('rejects photo when AI flags unsafe content', async () => {
    contentModerationService = buildContentModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'violence', confidence: 0.9 }],
      }),
    });
    feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue({ authorId: 'user-1' }),
    });

    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'rejected');
  });

  it('rejects media when R2 file not found', async () => {
    mockHeadObject.mockRejectedValue(new Error('NotFound'));

    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'rejected');
  });

  it('rejects media with zero content length', async () => {
    mockHeadObject.mockResolvedValue({ ContentLength: 0 });

    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'rejected');
  });

  it('rejects photo exceeding MAX_FILE_SIZE', async () => {
    mockHeadObject.mockResolvedValue({ ContentLength: 6 * 1024 * 1024 });

    await capturedProcessor({ data: buildJobData({ mediaType: 'photo' }) });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'rejected');
  });

  it('rejects video exceeding MAX_VIDEO_FILE_SIZE', async () => {
    mockHeadObject.mockResolvedValue({ ContentLength: 101 * 1024 * 1024 });

    await capturedProcessor({ data: buildJobData({ mediaType: 'video' }) });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'rejected');
  });

  it('auto-approves video (AI moderation is photo-only)', async () => {
    await capturedProcessor({ data: buildJobData({ mediaType: 'video' }) });

    expect(contentModerationService.analyzeImage).not.toHaveBeenCalled();
    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'approved');
  });

  it('auto-approves when no content moderation service configured', async () => {
    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService: undefined,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'approved');
  });

  it('falls back to approved when AI service throws', async () => {
    contentModerationService = buildContentModerationService({
      analyzeImage: vi.fn().mockRejectedValue(new Error('AI down')),
    });

    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(feedRepo.updateMediaModerationStatus).toHaveBeenCalledWith('media-1', 'approved');
  });

  it('sends rejection notification to post author', async () => {
    contentModerationService = buildContentModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'nudity', confidence: 0.95 }],
      }),
    });
    feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue({ authorId: 'user-42' }),
    });

    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService,
    });

    await capturedProcessor({ data: buildJobData() });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-42', title: 'Contenuto rifiutato' }),
    );
  });

  it('does not crash if rejection notification fails', async () => {
    contentModerationService = buildContentModerationService({
      analyzeImage: vi.fn().mockResolvedValue({
        safe: false,
        categories: [{ name: 'violence', confidence: 0.8 }],
      }),
    });
    feedRepo = buildFeedRepo({
      findPostById: vi.fn().mockResolvedValue({ authorId: 'user-1' }),
    });
    notificationService = buildNotificationService({
      send: vi.fn().mockRejectedValue(new Error('Push down')),
    });

    const { createContentModerationWorker } = await import('./content-moderation.js');
    createContentModerationWorker({
      feedRepo,
      notificationService,
      contentModerationService,
    });

    await expect(capturedProcessor({ data: buildJobData() })).resolves.toBeUndefined();
  });
});
