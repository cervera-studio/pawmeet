import { serverFetch } from '@/lib/server-api';
import type { PendingPhoto } from '@/repositories';
import { PhotoList } from './photo-list';

export default async function PhotoModerationPage() {
  const photos = await serverFetch<PendingPhoto[]>('/admin/moderation/photos');

  return (
    <div className="space-y-6">
      <PhotoList initialPhotos={photos} />
    </div>
  );
}
