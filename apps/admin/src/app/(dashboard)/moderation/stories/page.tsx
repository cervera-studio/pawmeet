import { getTranslations } from 'next-intl/server';
import { PAGINATION } from '@/lib/constants';
import { fetchStories } from './actions';
import { StoryGrid } from './story-grid';

export default async function StoryModerationPage() {
  const [initialData, t] = await Promise.all([
    fetchStories({ page: 1, pageSize: PAGINATION.DEFAULT_PAGE_SIZE }),
    getTranslations('stories'),
  ]);

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
