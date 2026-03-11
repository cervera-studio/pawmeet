import type { ApiClient } from '@dogwalk/api-client';
import type { ChatRepository } from '../interfaces';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function createTrpcChatRepository(
  api: ApiClient,
  getToken: () => string | null,
): ChatRepository {
  return {
    async listConversations() {
      const result = await api.chat.listConversations.query();
      return result as Awaited<ReturnType<ChatRepository['listConversations']>>;
    },
    async getMessages(matchId) {
      return api.chat.getMessages.query({ matchId });
    },
    async sendMessage(params) {
      return api.chat.sendMessage.mutate(params);
    },
    async markMessagesRead(matchId) {
      await api.chat.markMessagesRead.mutate({ matchId });
    },
    async uploadImage(matchId, imageUri) {
      const token = getToken();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'chat-image.jpg',
      } as unknown as Blob);

      const response = await fetch(`${API_URL}/api/chat/${matchId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return response.json() as Promise<{ mediaUrl: string }>;
    },
  };
}
