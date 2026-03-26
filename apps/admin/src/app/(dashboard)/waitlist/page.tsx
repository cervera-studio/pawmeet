import { getTranslations } from 'next-intl/server';
import { fetchWaitlistContacts } from './actions';
import { WaitlistTable } from './waitlist-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const [initialData, t] = await Promise.all([
    fetchWaitlistContacts({ page: 1, pageSize: DEFAULT_PAGE_SIZE, search: search || undefined }),
    getTranslations('waitlist'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <p className="text-neutral-500">{t('subtitle')}</p>
        </div>
      </div>

      <WaitlistTable initialData={initialData} initialSearch={search} />
    </div>
  );
}
