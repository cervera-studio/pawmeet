import { getServerTrpcClient } from '@/lib/server-api';
import { ContentList } from './content-list';

export default async function ContentModerationPage() {
  const api = await getServerTrpcClient();
  const initialData = await api.contentModeration.pendingReports.query({
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <ContentList initialData={initialData} />
    </div>
  );
}
