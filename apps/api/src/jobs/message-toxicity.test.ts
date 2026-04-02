import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationService } from '../ports/notification-service.js';
import type { ToxicityDetectionService } from '../ports/toxicity-detection-service.js';
import type { CommentToxicityJobData, MessageToxicityJobData } from './queues/index.js';

let capturedProcessor: (job: {
  name: string;
  data: MessageToxicityJobData | CommentToxicityJobData;
}) => Promise<void>;

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
  QUEUE_NAMES: { MESSAGE_TOXICITY: 'message-toxicity' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../constants/notifications.js', () => ({
  NOTIF_TOXICITY_WARNING: {
    title: 'Avviso',
    commentBody: 'Il tuo commento potrebbe contenere linguaggio inappropriato.',
    messageBody: 'Il tuo messaggio potrebbe contenere linguaggio inappropriato.',
  },
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildMessageJobData(
  overrides: Partial<MessageToxicityJobData> = {},
): MessageToxicityJobData {
  return {
    messageId: 'msg-1',
    matchId: 'match-1',
    senderId: 'user-1',
    content: 'Ciao, andiamo a passeggiare?',
    ...overrides,
  } satisfies MessageToxicityJobData;
}

function buildCommentJobData(
  overrides: Partial<CommentToxicityJobData> = {},
): CommentToxicityJobData {
  return {
    commentId: 'comment-1',
    postId: 'post-1',
    authorId: 'user-2',
    content: 'Bel cane!',
    ...overrides,
  } satisfies CommentToxicityJobData;
}

const nonToxicResult = {
  toxic: false,
  scores: { toxicity: 0.1, severeToxicity: 0.01, insult: 0.05, profanity: 0.02, threat: 0.0 },
};

const toxicResult = {
  toxic: true,
  scores: { toxicity: 0.95, severeToxicity: 0.8, insult: 0.7, profanity: 0.6, threat: 0.1 },
};

function buildToxicityService(
  overrides: Partial<ToxicityDetectionService> = {},
): ToxicityDetectionService {
  return {
    analyzeText: vi.fn().mockResolvedValue(nonToxicResult),
    ...overrides,
  } satisfies ToxicityDetectionService;
}

function buildNotificationService(
  overrides: Partial<NotificationService> = {},
): NotificationService {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies NotificationService;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createMessageToxicityWorker', () => {
  let toxicityService: ToxicityDetectionService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    toxicityService = buildToxicityService();
    notificationService = buildNotificationService();

    const { createMessageToxicityWorker } = await import('./message-toxicity.js');
    createMessageToxicityWorker({ toxicityService, notificationService });
  });

  it('analyzes message text with Italian language', async () => {
    await capturedProcessor({ name: 'check', data: buildMessageJobData() });

    expect(toxicityService.analyzeText).toHaveBeenCalledWith('Ciao, andiamo a passeggiare?', 'it');
  });

  it('does not notify when message is not toxic', async () => {
    await capturedProcessor({ name: 'check', data: buildMessageJobData() });

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('sends warning to sender when message is toxic', async () => {
    toxicityService = buildToxicityService({
      analyzeText: vi.fn().mockResolvedValue(toxicResult),
    });

    const { createMessageToxicityWorker } = await import('./message-toxicity.js');
    createMessageToxicityWorker({ toxicityService, notificationService });

    await capturedProcessor({ name: 'check', data: buildMessageJobData({ senderId: 'user-42' }) });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-42',
        title: 'Avviso',
        body: 'Il tuo messaggio potrebbe contenere linguaggio inappropriato.',
      }),
    );
  });

  it('sends comment-specific warning for toxic comments', async () => {
    toxicityService = buildToxicityService({
      analyzeText: vi.fn().mockResolvedValue(toxicResult),
    });

    const { createMessageToxicityWorker } = await import('./message-toxicity.js');
    createMessageToxicityWorker({ toxicityService, notificationService });

    await capturedProcessor({
      name: 'check-comment',
      data: buildCommentJobData({ authorId: 'user-99' }),
    });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-99',
        body: 'Il tuo commento potrebbe contenere linguaggio inappropriato.',
      }),
    );
  });

  it('skips empty/whitespace-only content', async () => {
    await capturedProcessor({ name: 'check', data: buildMessageJobData({ content: '   ' }) });

    expect(toxicityService.analyzeText).not.toHaveBeenCalled();
  });

  it('does not crash if notification send fails', async () => {
    toxicityService = buildToxicityService({
      analyzeText: vi.fn().mockResolvedValue(toxicResult),
    });
    notificationService = buildNotificationService({
      send: vi.fn().mockRejectedValue(new Error('Push down')),
    });

    const { createMessageToxicityWorker } = await import('./message-toxicity.js');
    createMessageToxicityWorker({ toxicityService, notificationService });

    await expect(
      capturedProcessor({ name: 'check', data: buildMessageJobData() }),
    ).resolves.toBeUndefined();
  });
});
