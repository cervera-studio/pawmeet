import type { ChatMessage } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { ChatService, MessageRepository } from '../ports/index.js';
import { createSendMessage } from './send-message.js';

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    senderId: 'user-1',
    content: 'Ciao!',
    mediaUrl: null,
    status: 'sent',
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildMessageRepo(overrides: Partial<MessageRepository> = {}): MessageRepository {
  return {
    getConversationsForUser: vi.fn(),
    findByMatch: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    isMatchParticipant: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function buildChat(overrides: Partial<ChatService> = {}): ChatService {
  return {
    joinRoom: vi.fn(),
    sendToRoom: vi.fn(),
    ...overrides,
  };
}

describe('sendMessage', () => {
  it('sends a message and emits WS event', async () => {
    const msg = buildMessage();
    const messageRepo = buildMessageRepo({
      create: vi.fn().mockResolvedValue(msg),
    });
    const chat = buildChat();
    const sendMessage = createSendMessage({ messageRepo, chat });

    const result = await sendMessage('user-1', 'match-1', 'Ciao!');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message.content).toBe('Ciao!');
    expect(messageRepo.create).toHaveBeenCalledWith({
      matchId: 'match-1',
      senderId: 'user-1',
      content: 'Ciao!',
      mediaUrl: null,
    });
    expect(chat.sendToRoom).toHaveBeenCalledWith(
      'match-1',
      expect.objectContaining({
        type: 'new_message',
        payload: { message: msg },
      }),
    );
  });

  it('includes mediaUrl when provided', async () => {
    const msg = buildMessage({ mediaUrl: 'https://cdn.example.com/photo.jpg' });
    const messageRepo = buildMessageRepo({
      create: vi.fn().mockResolvedValue(msg),
    });
    const chat = buildChat();
    const sendMessage = createSendMessage({ messageRepo, chat });

    const result = await sendMessage(
      'user-1',
      'match-1',
      'Guarda!',
      'https://cdn.example.com/photo.jpg',
    );

    expect(isSuccess(result)).toBe(true);
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ mediaUrl: 'https://cdn.example.com/photo.jpg' }),
    );
  });

  it('fails with CONVERSATION_NOT_FOUND when user is not a participant', async () => {
    const messageRepo = buildMessageRepo({
      isMatchParticipant: vi.fn().mockResolvedValue(false),
    });
    const chat = buildChat();
    const sendMessage = createSendMessage({ messageRepo, chat });

    const result = await sendMessage('user-1', 'match-1', 'Ciao!');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CONVERSATION_NOT_FOUND');
    expect(result.error.status).toBe(404);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(chat.sendToRoom).not.toHaveBeenCalled();
  });
});
