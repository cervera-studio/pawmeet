import { getServerTrpcClient } from '@/lib/server-api';
import { GroupEventsTable } from './group-events-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function GroupEventsPage() {
  const api = await getServerTrpcClient();

  const result = await api.admin.listGroupEvents.query({
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
        <h1 className="text-2xl font-bold text-neutral-900">Eventi</h1>
        <p className="text-neutral-500">Gestione eventi di gruppo sulla piattaforma</p>
      </div>

      <GroupEventsTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
