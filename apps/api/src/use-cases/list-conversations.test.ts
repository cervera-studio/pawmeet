import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { ConversationSummary } from '../ports/index.js';
import {
  buildChatService,
  buildDog,
  buildDogRepo,
  buildMessageRepo,
} from '../test-utils/builders.js';
import { createListConversations } from './list-conversations.js';

function buildConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    matchId: 'match-1',
    compatibilityScore: 0.85,
    otherUser: { id: 'user-2', displayName: 'Luigi Verdi', avatarUrl: null },
    otherDogName: 'Bella',
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

describe('listConversations', () => {
  it('returns conversations and joins WS rooms', async () => {
    const conv = buildConversation();
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog()]),
    });
    const messageRepo = buildMessageRepo({
      getConversationsForUser: vi.fn().mockResolvedValue([conv]),
    });
    const chat = buildChatService();

    const listConversations = createListConversations({ dogRepo, messageRepo, chat });
    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toHaveLength(1);
    expect(result.data.conversations[0].matchId).toBe('match-1');
    expect(chat.joinRoom).toHaveBeenCalledWith('match-1', 'user-1');
  });

  it('returns empty conversations when user has no dogs', async () => {
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([]),
    });
    const messageRepo = buildMessageRepo();
    const chat = buildChatService();

    const listConversations = createListConversations({ dogRepo, messageRepo, chat });
    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toHaveLength(0);
    expect(messageRepo.getConversationsForUser).not.toHaveBeenCalled();
  });
});
