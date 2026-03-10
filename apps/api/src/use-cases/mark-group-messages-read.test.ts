import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';
import type { ChatService } from '../ports/index.js';
import { createMarkGroupMessagesRead } from './mark-group-messages-read.js';

function buildGroupMessageRepo(
  overrides: Partial<GroupMessageRepository> = {},
): GroupMessageRepository {
  return {
    create: vi.fn(),
    findByEvent: vi.fn(),
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

describe('markGroupMessagesRead', () => {
  it('marks messages as read and broadcasts WS event', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const chatService = buildChat();
    const markRead = createMarkGroupMessagesRead({ groupMessageRepo, chat: chatService });

    const result = await markRead('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    expect(groupMessageRepo.markAsRead).toHaveBeenCalledWith('event-1', 'user-1');
    expect(chatService.sendToRoom).toHaveBeenCalledWith(
      'group-event-1',
      expect.objectContaining({ type: 'message_read' }),
      'user-1',
    );
  });

  it('fails when user is not a participant', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      isEventParticipant: vi.fn().mockResolvedValue(false),
    });
    const markRead = createMarkGroupMessagesRead({ groupMessageRepo, chat: buildChat() });

    const result = await markRead('user-99', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });
});
