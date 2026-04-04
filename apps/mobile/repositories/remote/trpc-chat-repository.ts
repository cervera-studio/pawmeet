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
      // Step 1: Read image into blob to get actual size
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Step 2: Get presigned URL with real file size
      const { uploadUrl, publicUrl } = await api.chat.uploadMediaUrl.mutate({
        matchId,
        contentType: 'image/jpeg',
        fileSize: blob.size,
      });

      // Step 3: Upload to R2
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      return { mediaUrl: publicUrl };
    },
  };
}
