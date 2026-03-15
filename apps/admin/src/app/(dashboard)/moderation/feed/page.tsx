import { fetchFeedPosts, fetchFeedStats } from './actions';
import { FeedList } from './feed-list';

export default async function FeedModerationPage() {
  const [initialPosts, initialStats] = await Promise.all([
    fetchFeedPosts({ page: 1, pageSize: 20 }),
    fetchFeedStats(),
  ]);

  return (
    <div className="space-y-6">
      <FeedList initialPosts={initialPosts} initialStats={initialStats} />
    </div>
  );
}
