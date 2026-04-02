import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../ports/user-repository.js';
import type { NotificationJobData } from './queues/index.js';

let capturedProcessor: (job: { data: NotificationJobData }) => Promise<void>;

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
  QUEUE_NAMES: { NOTIFICATIONS: 'notifications' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { debug: vi.fn(), error: vi.fn() },
}));

const mockSendPush = vi.fn();
vi.mock('../lib/push.js', () => ({
  expo: { sendPushNotificationsAsync: (...args: unknown[]) => mockSendPush(...args) },
}));

// ── Builders ───────────────────────────────────────────────────────────────

function buildJobData(overrides: Partial<NotificationJobData> = {}): NotificationJobData {
  return {
    userId: 'user-1',
    title: 'Test Title',
    body: 'Test body message',
    ...overrides,
  } satisfies NotificationJobData;
}

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findPushToken: vi.fn().mockResolvedValue('ExponentPushToken[abc123]'),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIdWithPassword: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    searchByName: vi.fn(),
    ...overrides,
  } satisfies UserRepository;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createNotificationWorker', () => {
  let userRepo: UserRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSendPush.mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]);
    userRepo = buildUserRepo();

    const { createNotificationWorker } = await import('./send-notification.js');
    createNotificationWorker({ userRepo });
  });

  it('sends push notification with correct payload', async () => {
    await capturedProcessor({ data: buildJobData() });

    expect(mockSendPush).toHaveBeenCalledWith([
      expect.objectContaining({
        to: 'ExponentPushToken[abc123]',
        title: 'Test Title',
        body: 'Test body message',
        sound: 'default',
      }),
    ]);
  });

  it('skips when user has no push token', async () => {
    userRepo = buildUserRepo({
      findPushToken: vi.fn().mockResolvedValue(null),
    });

    const { createNotificationWorker } = await import('./send-notification.js');
    createNotificationWorker({ userRepo });

    await capturedProcessor({ data: buildJobData() });

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('passes data field to push payload', async () => {
    const data = { type: 'walk_reminder', walkId: 'walk-1' };
    await capturedProcessor({
      data: buildJobData({ data: data as NotificationJobData['data'] }),
    });

    expect(mockSendPush).toHaveBeenCalledWith([expect.objectContaining({ data })]);
  });

  it('handles push ticket error status without throwing', async () => {
    mockSendPush.mockResolvedValue([
      {
        status: 'error',
        message: 'DeviceNotRegistered',
        details: { error: 'DeviceNotRegistered' },
      },
    ]);

    await expect(capturedProcessor({ data: buildJobData() })).resolves.toBeUndefined();
  });
});
