import { getServerTrpcClient } from '@/lib/server-api';
import { ContactsTable } from './contacts-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function EmergencyContactsPage() {
  const api = await getServerTrpcClient();

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
        <h1 className="text-2xl font-bold text-neutral-900">Contatti di emergenza</h1>
        <p className="text-neutral-500">Contatti di emergenza registrati dagli utenti</p>
      </div>

      <ContactsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
