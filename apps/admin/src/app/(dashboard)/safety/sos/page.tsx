import { getServerTrpcClient } from '@/lib/server-api';
import { SosTable } from './sos-table';

const DEFAULT_PAGE_SIZE = 20;

export default async function SosAlertsPage() {
  const api = await getServerTrpcClient();

  const result = await api.admin.listSosAlerts.query({
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
        <h1 className="text-2xl font-bold text-neutral-900">Allarmi SOS e Check-in</h1>
        <p className="text-neutral-500">Log degli allarmi SOS, alert automatici e check-in sicurezza</p>
      </div>

      <SosTable initialData={initialData} pageSize={DEFAULT_PAGE_SIZE} />
    </div>
  );
}
