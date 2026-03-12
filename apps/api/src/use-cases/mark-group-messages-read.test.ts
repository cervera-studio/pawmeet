import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildChatService, buildGroupMessageRepo } from '../test-utils/builders.js';
import { createMarkGroupMessagesRead } from './mark-group-messages-read.js';

describe('markGroupMessagesRead', () => {
  it('marks messages as read and broadcasts WS event', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const chatService = buildChatService();
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
    const markRead = createMarkGroupMessagesRead({ groupMessageRepo, chat: buildChatService() });

    const result = await markRead('user-99', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });
});
