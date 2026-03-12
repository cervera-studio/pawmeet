import type { ApiClient } from '@pawmeet/api-client';
import type { GroupChatRepository } from '../interfaces';

export function createTrpcGroupChatRepository(api: ApiClient): GroupChatRepository {
  return {
    async listConversations() {
      return api.groupChat.listConversations.query();
    },
    async getMessages(eventId, cursor?) {
      return api.groupChat.getMessages.query({ eventId, cursor });
    },
    async sendMessage(eventId, content) {
      return api.groupChat.sendMessage.mutate({ eventId, content });
    },
    async markMessagesRead(eventId) {
      await api.groupChat.markMessagesRead.mutate({ eventId });
    },
  };
}
