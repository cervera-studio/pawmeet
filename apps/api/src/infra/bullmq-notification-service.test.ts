import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnqueueNotification = vi.fn().mockResolvedValue(undefined);

vi.mock('../jobs/queues/index.js', () => ({
  enqueueNotification: (...args: unknown[]) => mockEnqueueNotification(...args),
}));

import { BullMQNotificationService } from './bullmq-notification-service.js';

describe('BullMQNotificationService', () => {
  let service: BullMQNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BullMQNotificationService();
  });

  it('enqueues a notification with all required fields', async () => {
    const data = {
      userId: 'user-1',
      title: 'New match!',
      body: 'You have a new walking buddy',
    };

    await service.send(data);

    expect(mockEnqueueNotification).toHaveBeenCalledOnce();
    expect(mockEnqueueNotification).toHaveBeenCalledWith(data);
  });

  it('enqueues a notification with optional data payload', async () => {
    const data = {
      userId: 'user-2',
      title: 'Message received',
      body: 'Someone sent you a message',
      data: { type: 'chat_message' as const, matchId: 'match-1' },
    };

    await service.send(data);

    expect(mockEnqueueNotification).toHaveBeenCalledWith(data);
  });

  it('propagates errors from the queue', async () => {
    mockEnqueueNotification.mockRejectedValueOnce(new Error('Queue connection failed'));

    await expect(service.send({ userId: 'user-3', title: 'Test', body: 'Body' })).rejects.toThrow(
      'Queue connection failed',
    );
  });
});
