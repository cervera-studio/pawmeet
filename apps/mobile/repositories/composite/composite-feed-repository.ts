import type { ContentReportReason } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type {
  FeedComment,
  FeedItem,
  FeedPage,
  FeedRepository,
  LocalCache,
  NetworkState,
  StoryGroup,
  SyncQueue,
} from '../interfaces';

interface CompositeFeedDeps {
  remote: FeedRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

/**
 * Composite FeedRepository: caches feed locally for offline viewing,
 * queues mutations (likes, comments) for sync when offline.
 *
 * All infrastructure dependencies are injected.
 */
export function createCompositeFeedRepository(deps: CompositeFeedDeps): FeedRepository {
  const { remote, cache, network, syncQueue } = deps;

  async function cacheItems(items: FeedItem[]): Promise<void> {
    for (const item of items) {
      const id = item.id as string;
      const createdAt = (item.createdAt as string) ?? new Date().toISOString();
      if (!id) continue;
      await cache.run(
        `INSERT OR REPLACE INTO cached_feed (id, data, created_at) VALUES (?, ?, ?)`,
        [id, JSON.stringify(item), createdAt],
      );
    }
  }

  return {
    async timeline(cursor?: string, limit?: number): Promise<FeedPage> {
      // Try remote first when online
      if (network.isOnline()) {
        try {
          const result = await remote.timeline(cursor, limit);
          cacheItems(result.items).catch((e) =>
            logger.warn('CompositeFeed', 'Cache write failed', e),
          );
          return result;
        } catch {
          // Fall through to local
        }
      }

      // Offline: return cached items
      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_feed ORDER BY created_at DESC LIMIT 50',
      );
      const items = cached.map((row) => JSON.parse(row.data) as FeedItem);
      return { items, nextCursor: null };
    },

    async stories(): Promise<{ groups: StoryGroup[] }> {
      if (!network.isOnline()) return { groups: [] };
      return remote.stories();
    },

    async like(postId: string): Promise<{ liked: boolean }> {
      if (network.isOnline()) return remote.like(postId);

      await syncQueue.enqueue({
        entityType: 'post_like',
        operation: 'create',
        endpoint: 'feed.like',
        payload: { postId },
      });
      return { liked: true };
    },

    async createComment(
      postId: string,
      content: string,
      parentId?: string,
    ): Promise<{ comment: FeedComment }> {
      if (network.isOnline()) return remote.createComment(postId, content, parentId);

      await syncQueue.enqueue({
        entityType: 'comment',
        operation: 'create',
        endpoint: 'feed.createComment',
        payload: { postId, content, parentId },
      });
      return {
        comment: {
          id: `local_${Date.now()}`,
          postId,
          content,
          createdAt: new Date().toISOString(),
        },
      };
    },

    async getComments(postId: string, cursor?: string, limit?: number) {
      if (!network.isOnline()) return { comments: [], nextCursor: null };
      return remote.getComments(postId, cursor, limit);
    },

    async deletePost(postId: string): Promise<void> {
      if (network.isOnline()) {
        await remote.deletePost(postId);
        await cache.run('DELETE FROM cached_feed WHERE id = ?', [postId]);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'post',
        operation: 'delete',
        endpoint: 'feed.deletePost',
        payload: { postId },
      });
    },

    async viewStory(storyId: string): Promise<void> {
      if (!network.isOnline()) return;
      return remote.viewStory(storyId);
    },

    async reportContent(
      contentType: 'post' | 'comment' | 'story',
      contentId: string,
      reason: ContentReportReason,
    ): Promise<void> {
      if (network.isOnline()) return remote.reportContent(contentType, contentId, reason);

      await syncQueue.enqueue({
        entityType: 'report',
        operation: 'create',
        endpoint: 'feed.reportContent',
        payload: { contentType, contentId, reason },
      });
    },

    async addReaction(
      contentType: 'post' | 'comment' | 'story',
      contentId: string,
      emoji: string,
    ): Promise<void> {
      if (network.isOnline()) {
        await remote.addReaction(contentType, contentId, emoji);
        return;
      }

      await syncQueue.enqueue({
        entityType: 'reaction',
        operation: 'create',
        endpoint: 'feed.addReaction',
        payload: { contentType, contentId, emoji },
      });
    },

    async removeReaction(
      contentType: 'post' | 'comment' | 'story',
      contentId: string,
      emoji: string,
    ): Promise<void> {
      if (network.isOnline()) {
        await remote.removeReaction(contentType, contentId, emoji);
        return;
      }

      await syncQueue.enqueue({
        entityType: 'reaction',
        operation: 'delete',
        endpoint: 'feed.removeReaction',
        payload: { contentType, contentId, emoji },
      });
    },
  };
}
