import type { GroupChatMessage } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { ChatService } from '../ports/index.js';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import { createGetGroupMessages } from './get-group-messages.js';

function buildMessage(overrides: Partial<GroupChatMessage> = {}): GroupChatMessage {
  return {
    id: 'msg-1',
    eventId: 'event-1',
    senderId: 'user-1',
    content: 'Ciao!',
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
    create: vi.fn(),
    findByEvent: vi.fn().mockResolvedValue({
      messages: [buildMessage()],
      nextCursor: null,
      hasMore: false,
    }),
    getConversationsForUser: vi.fn(),
    markAsRead: vi.fn(),
    isEventParticipant: vi.fn().mockResolvedValue(true),
    getParticipantUserIds: vi.fn(),
    ...overrides,
  };
}

function buildChat(): ChatService {
  return { joinRoom: vi.fn(), sendToRoom: vi.fn() };
}

describe('getGroupMessages', () => {
  it('returns paginated messages and joins WS room', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const chatService = buildChat();
    const get = createGetGroupMessages({ groupMessageRepo, chat: chatService });

    const result = await get('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.messages).toHaveLength(1);
    expect(result.data.hasMore).toBe(false);
    expect(chatService.joinRoom).toHaveBeenCalledWith('group-event-1', 'user-1');
  });

  it('fails when user is not a participant', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      isEventParticipant: vi.fn().mockResolvedValue(false),
    });
    const get = createGetGroupMessages({ groupMessageRepo, chat: buildChat() });

    const result = await get('user-99', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });

  it('passes cursor and limit to repository', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const get = createGetGroupMessages({ groupMessageRepo, chat: buildChat() });

    await get('user-1', 'event-1', 'cursor-id', 10);

    expect(groupMessageRepo.findByEvent).toHaveBeenCalledWith('event-1', 'cursor-id', 10);
  });
});
