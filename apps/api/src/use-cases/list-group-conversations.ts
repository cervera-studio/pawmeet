import type { GroupConversationSummary } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { ChatService } from '../ports/index.js';
import type { GroupMessageRepository } from '../ports/group-message-repository.js';

type Deps = {
  groupMessageRepo: GroupMessageRepository;
  chat: ChatService;
};

export function createListGroupConversations({ groupMessageRepo, chat }: Deps) {
  return async (
    userId: string,
  ): Promise<Result<{ conversations: GroupConversationSummary[] }>> => {
    const conversations = await groupMessageRepo.getConversationsForUser(userId);

    for (const conv of conversations) {
      chat.joinRoom(`group-${conv.eventId}`, userId);
    }

    return succeed({ conversations });
  };
}
