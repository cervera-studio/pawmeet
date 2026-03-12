import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../ports/index.js';
import {
  buildChatService,
  buildGroupMessage,
  buildGroupMessageRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createSendGroupMessage } from './send-group-message.js';

function buildSendGroupUserRepo(): UserRepository {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'user-1',
      displayName: 'Mario',
      notificationPrefs: { messages: true },
    }),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateLocation: vi.fn(),
    findNearby: vi.fn(),
    delete: vi.fn(),
  } as unknown as UserRepository;
}

describe('sendGroupMessage', () => {
  it('creates a message and broadcasts to the group room', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      create: vi.fn().mockResolvedValue(buildGroupMessage({ content: 'Ciao a tutti!' })),
      getParticipantUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2', 'user-3']),
    });
    const chatService = buildChatService();
    const userRepo = buildSendGroupUserRepo();
    const notificationService = buildNotificationService();
    const send = createSendGroupMessage({
      groupMessageRepo,
      chat: chatService,
      userRepo,
      notificationService,
    });

    const result = await send('user-1', 'event-1', 'Ciao a tutti!');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message.content).toBe('Ciao a tutti!');
    expect(chatService.sendToRoom).toHaveBeenCalledWith(
      'group-event-1',
      expect.objectContaining({ type: 'new_message' }),
    );
  });

  it('fails when user is not a participant', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      isEventParticipant: vi.fn().mockResolvedValue(false),
    });
    const send = createSendGroupMessage({
      groupMessageRepo,
      chat: buildChatService(),
      userRepo: buildSendGroupUserRepo(),
      notificationService: buildNotificationService(),
    });

    const result = await send('user-99', 'event-1', 'Ciao');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });

  it('sends push notifications to other participants', async () => {
    const notificationService = buildNotificationService();
    const send = createSendGroupMessage({
      groupMessageRepo: buildGroupMessageRepo({
        create: vi.fn().mockResolvedValue(buildGroupMessage({ content: 'Ci vediamo!' })),
        getParticipantUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2', 'user-3']),
      }),
      chat: buildChatService(),
      userRepo: buildSendGroupUserRepo(),
      notificationService,
    });

    await send('user-1', 'event-1', 'Ci vediamo!');

    // Should notify user-2 and user-3 but not user-1 (sender)
    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-3' }),
    );
  });
});
