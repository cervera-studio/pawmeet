import type { GroupChatMessage } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { ChatService, NotificationService, UserRepository } from '../ports/index.js';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import { createSendGroupMessage } from './send-group-message.js';

function buildMessage(overrides: Partial<GroupChatMessage> = {}): GroupChatMessage {
  return {
    id: 'msg-1',
    eventId: 'event-1',
    senderId: 'user-1',
    content: 'Ciao a tutti!',
    mediaUrl: null,
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildGroupMessageRepo(
  overrides: Partial<GroupMessageRepository> = {},
): GroupMessageRepository {
  return {
    create: vi.fn().mockResolvedValue(buildMessage()),
    findByEvent: vi.fn(),
    getConversationsForUser: vi.fn(),
    markAsRead: vi.fn(),
    isEventParticipant: vi.fn().mockResolvedValue(true),
    getParticipantUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2', 'user-3']),
    ...overrides,
  };
}

function buildChat(): ChatService {
  return { joinRoom: vi.fn(), sendToRoom: vi.fn() };
}

function buildUserRepo(): UserRepository {
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

function buildNotificationService(): NotificationService {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('sendGroupMessage', () => {
  it('creates a message and broadcasts to the group room', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const chatService = buildChat();
    const userRepo = buildUserRepo();
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
      chat: buildChat(),
      userRepo: buildUserRepo(),
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
      groupMessageRepo: buildGroupMessageRepo(),
      chat: buildChat(),
      userRepo: buildUserRepo(),
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
