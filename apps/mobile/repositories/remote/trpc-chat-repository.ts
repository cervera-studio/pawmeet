import type { ApiClient } from '@pawmeet/api-client';
import type { ChatRepository } from '../interfaces';

export function createTrpcChatRepository(api: ApiClient): ChatRepository {
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
      // Step 1: Get presigned URL
      const { uploadUrl, key } = await api.chat.uploadMediaUrl.mutate({
        matchId,
        contentType: 'image/jpeg',
        fileSize: 0, // Size checked server-side after upload
      });

      // Step 2: Upload to R2
      const response = await fetch(imageUri);
      const blob = await response.blob();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      // Step 3: Build the public URL from the key
      const publicUrl = key; // Server resolves this to full URL when reading
      return { mediaUrl: publicUrl };
    },
  };
}
