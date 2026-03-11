import { getServerTrpcClient } from '@/lib/server-api';
import { FeedList } from './feed-list';

export default async function FeedModerationPage() {
  const api = await getServerTrpcClient();

  const [initialPosts, initialStats] = await Promise.all([
    api.admin.listFeedPosts.query({ page: 1, pageSize: 20 }),
    api.admin.getFeedStats.query(),
  ]);

  return (
    <div className="space-y-6">
      <FeedList initialPosts={initialPosts} initialStats={initialStats} />
    </div>
  );
}
