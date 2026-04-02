import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildChatService, buildMessage, buildMessageRepo } from '../test-utils/builders.js';
import { createGetMessages } from './get-messages.js';

function buildDeps() {
  return {
    messageRepo: buildMessageRepo({
      isMatchParticipant: vi.fn().mockResolvedValue(true),
      findByMatch: vi.fn().mockResolvedValue({
        messages: [buildMessage()],
        nextCursor: null,
        hasMore: false,
      }),
    }),
    chat: buildChatService(),
  };
}

describe('createGetMessages', () => {
  it('returns paginated messages and joins WS room', async () => {
    const deps = buildDeps();
    const getMessages = createGetMessages(deps);

    const result = await getMessages('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.messages).toHaveLength(1);
    expect(result.data.hasMore).toBe(false);
    expect(deps.chat.joinRoom).toHaveBeenCalledWith('match-1', 'user-1');
  });

  it('passes cursor and limit to repo', async () => {
    const deps = buildDeps();
    const getMessages = createGetMessages(deps);

    await getMessages('user-1', 'match-1', 'cursor-abc', 50);

    expect(deps.messageRepo.findByMatch).toHaveBeenCalledWith('match-1', 'cursor-abc', 50);
  });

  it('fails with 404 when user is not a participant', async () => {
    const deps = buildDeps();
    deps.messageRepo.isMatchParticipant = vi.fn().mockResolvedValue(false);
    const getMessages = createGetMessages(deps);

    const result = await getMessages('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CONVERSATION_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
