import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';
import { ContactsTable } from './contacts-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function EmergencyContactsPage() {
  const [api, t] = await Promise.all([getServerTrpcClient(), getTranslations('safety.contacts')]);

  const result = await api.admin.listEmergencyContacts.query({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const initialData = {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.page < result.totalPages,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <ContactsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
