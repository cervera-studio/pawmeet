import { fetchPendingPhotos } from './actions';
import { PhotoList } from './photo-list';

export default async function PhotoModerationPage() {
  const photos = await fetchPendingPhotos();

  return (
    <div className="space-y-6">
      <PhotoList initialPhotos={photos} />
    </div>
  );
}
