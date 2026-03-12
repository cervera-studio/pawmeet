import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildChatService,
  buildMatchRepo,
  buildMessage,
  buildMessageRepo,
  buildNotificationService,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createSendMessage } from './send-message.js';

describe('sendMessage', () => {
  it('sends a message and emits WS event', async () => {
    const msg = buildMessage();
    const messageRepo = buildMessageRepo({
      create: vi.fn().mockResolvedValue(msg),
    });
    const chat = buildChatService();
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const matchRepo = buildMatchRepo();
    const sendMessage = createSendMessage({ messageRepo, matchRepo, chat, userRepo, notificationService });

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
    const chat = buildChatService();
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const matchRepo = buildMatchRepo();
    const sendMessage = createSendMessage({ messageRepo, matchRepo, chat, userRepo, notificationService });

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
    const chat = buildChatService();
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const matchRepo = buildMatchRepo();
    const sendMessage = createSendMessage({ messageRepo, matchRepo, chat, userRepo, notificationService });

    const result = await sendMessage('user-1', 'match-1', 'Ciao!');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CONVERSATION_NOT_FOUND');
    expect(result.error.status).toBe(404);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(chat.sendToRoom).not.toHaveBeenCalled();
  });
});
