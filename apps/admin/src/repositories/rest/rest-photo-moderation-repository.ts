import type { api as ApiClientInstance } from '@/lib/api';
import type { PendingPhoto, PhotoModerationRepository } from '../interfaces';

type RestClient = typeof ApiClientInstance;

export function createRestPhotoModerationRepository(client: RestClient): PhotoModerationRepository {
  return {
    async listPending(): Promise<PendingPhoto[]> {
      return client.get<PendingPhoto[]>('/admin/moderation/photos');
    },
    async approve(photoId: string): Promise<void> {
      await client.post(`/admin/moderation/photos/${photoId}/approve`);
    },
    async reject(photoId: string): Promise<void> {
      await client.post(`/admin/moderation/photos/${photoId}/reject`);
    },
    async approveAll(): Promise<void> {
      await client.post('/admin/moderation/photos/approve-all');
    },
  };
}
