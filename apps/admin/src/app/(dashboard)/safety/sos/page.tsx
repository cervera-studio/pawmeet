import { getTranslations } from 'next-intl/server';
import { fetchSosAlerts } from '../actions';
import { SosTable } from './sos-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function SosAlertsPage() {
  const [initialData, t] = await Promise.all([
    fetchSosAlerts({ page: 1, pageSize: DEFAULT_PAGE_SIZE }),
    getTranslations('safety.sos'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      <SosTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
