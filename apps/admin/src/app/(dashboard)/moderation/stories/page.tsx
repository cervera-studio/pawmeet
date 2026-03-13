import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';
import { StoryGrid } from './story-grid';

export default async function StoryModerationPage() {
  const api = await getServerTrpcClient();
  const t = await getTranslations('stories');

  const initialData = await api.admin.listStories.query({ page: 1, pageSize: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <StoryGrid initialData={initialData} />
    </div>
  );
}
