import { isFailure, isSuccess, WS_EVENT } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildChatService, buildMessageRepo } from '../test-utils/builders.js';
import { createMarkMessagesRead } from './mark-messages-read.js';

function buildDeps() {
  return {
    messageRepo: buildMessageRepo({
      isMatchParticipant: vi.fn().mockResolvedValue(true),
      markAsRead: vi.fn().mockResolvedValue(undefined),
    }),
    chat: buildChatService(),
  };
}

describe('createMarkMessagesRead', () => {
  it('marks messages as read and broadcasts WS event', async () => {
    const deps = buildDeps();
    const markRead = createMarkMessagesRead(deps);

    const result = await markRead('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Messages marked as read');
    expect(deps.messageRepo.markAsRead).toHaveBeenCalledWith('match-1', 'user-1');
    expect(deps.chat.sendToRoom).toHaveBeenCalledWith(
      'match-1',
      { type: WS_EVENT.MESSAGE_READ, payload: { matchId: 'match-1', readBy: 'user-1' } },
      'user-1',
    );
  });

  it('fails with 404 when user is not a participant', async () => {
    const deps = buildDeps();
    deps.messageRepo.isMatchParticipant = vi.fn().mockResolvedValue(false);
    const markRead = createMarkMessagesRead(deps);

    const result = await markRead('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CONVERSATION_NOT_FOUND');
  });
});
