import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { ChatService, ConversationSummary, DogRepository, MessageRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  messageRepo: MessageRepository;
  chat: ChatService;
};

export function createListConversations({ dogRepo, messageRepo, chat }: Deps) {
  return async (userId: string): Promise<Result<{ conversations: ConversationSummary[] }>> => {
    const userDogs = await dogRepo.findByOwner(userId);
    if (userDogs.length === 0) {
      return succeed({ conversations: [] });
    }

    const dogIds = userDogs.map((d) => d.id);
    const conversations = await messageRepo.getConversationsForUser(userId, dogIds);

    // Join WebSocket rooms for each conversation
    for (const conv of conversations) {
      chat.joinRoom(conv.matchId, userId);
    }

    return succeed({ conversations });
  };
}
