import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildChatService, buildGroupMessageRepo } from '../test-utils/builders.js';
import { createListGroupConversations } from './list-group-conversations.js';

function buildDeps() {
  return {
    groupMessageRepo: buildGroupMessageRepo({
      getConversationsForUser: vi.fn().mockResolvedValue([
        { eventId: 'event-1', title: 'Walk group', lastMessage: null, unreadCount: 0 },
        { eventId: 'event-2', title: 'Park crew', lastMessage: null, unreadCount: 3 },
      ]),
    }),
    chat: buildChatService(),
  };
}

describe('createListGroupConversations', () => {
  it('returns conversations and joins WS rooms', async () => {
    const deps = buildDeps();
    const listConversations = createListGroupConversations(deps);

    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toHaveLength(2);
    expect(deps.chat.joinRoom).toHaveBeenCalledWith('group-event-1', 'user-1');
    expect(deps.chat.joinRoom).toHaveBeenCalledWith('group-event-2', 'user-1');
  });

  it('returns empty array when no conversations', async () => {
    const deps = buildDeps();
    deps.groupMessageRepo.getConversationsForUser = vi.fn().mockResolvedValue([]);
    const listConversations = createListGroupConversations(deps);

    const result = await listConversations('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.conversations).toEqual([]);
    expect(deps.chat.joinRoom).not.toHaveBeenCalled();
  });
});
