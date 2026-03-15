import { PAGINATION } from '@/lib/constants';
import { fetchFeedPosts, fetchFeedStats } from './actions';
import { FeedList } from './feed-list';

export default async function FeedModerationPage() {
  const [initialPosts, initialStats] = await Promise.all([
    fetchFeedPosts({ page: 1, pageSize: PAGINATION.DEFAULT_PAGE_SIZE }),
    fetchFeedStats(),
  ]);

  return (
    <div className="space-y-6">
      <FeedList initialPosts={initialPosts} initialStats={initialStats} />
    </div>
  );
}
