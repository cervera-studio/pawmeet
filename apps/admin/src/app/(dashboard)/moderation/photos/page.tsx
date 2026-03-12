import { getServerTrpcClient } from '@/lib/server-api';
import { PhotoList } from './photo-list';

export default async function PhotoModerationPage() {
  const api = await getServerTrpcClient();
  const photos = await api.admin.listPendingPhotos.query();

  return (
    <div className="space-y-6">
      <PhotoList initialPhotos={photos} />
    </div>
  );
}
