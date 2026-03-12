import { getServerTrpcClient } from '@/lib/server-api';
import { StoryGrid } from './story-grid';

export default async function StoryModerationPage() {
  const api = await getServerTrpcClient();

  const initialData = await api.admin.listStories.query({ page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Gestione storie</h1>
        <p className="text-neutral-500">Visualizza e modera le storie degli utenti</p>
      </div>

      <StoryGrid initialData={initialData} />
    </div>
  );
}
