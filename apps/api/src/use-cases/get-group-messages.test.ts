import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildChatService,
  buildGroupMessage,
  buildGroupMessageRepo,
} from '../test-utils/builders.js';
import { createGetGroupMessages } from './get-group-messages.js';

describe('getGroupMessages', () => {
  it('returns paginated messages and joins WS room', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      findByEvent: vi.fn().mockResolvedValue({
        messages: [buildGroupMessage()],
        nextCursor: null,
        hasMore: false,
      }),
    });
    const chatService = buildChatService();
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
    const get = createGetGroupMessages({ groupMessageRepo, chat: buildChatService() });

    const result = await get('user-99', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });

  it('passes cursor and limit to repository', async () => {
    const groupMessageRepo = buildGroupMessageRepo();
    const get = createGetGroupMessages({ groupMessageRepo, chat: buildChatService() });

    await get('user-1', 'event-1', 'cursor-id', 10);

    expect(groupMessageRepo.findByEvent).toHaveBeenCalledWith('event-1', 'cursor-id', 10);
  });
});
