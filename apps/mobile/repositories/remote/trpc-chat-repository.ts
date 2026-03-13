import type { ApiClient } from '@pawmeet/api-client';
import type { ChatRepository } from '../interfaces';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:3000' : '');

export function createTrpcChatRepository(
  api: ApiClient,
  getToken: () => string | null,
): ChatRepository {
  return {
    async listConversations() {
      return api.chat.listConversations.query();
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
      // RN FormData accepts { uri, type, name } objects but TS types expect Blob
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
      const json: { mediaUrl: string } = await response.json();
      return json;
    },
  };
}
