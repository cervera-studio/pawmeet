import type { GroupChatMessage, Serialized } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type {
  GroupChatRepository,
  GroupConversation,
  LocalCache,
  NetworkState,
  SyncQueue,
} from '../interfaces';

interface Deps {
  remote: GroupChatRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

export function createCompositeGroupChatRepository(deps: Deps): GroupChatRepository {
  const { remote, cache, network, syncQueue } = deps;

  return {
    async listConversations(): Promise<{ conversations: GroupConversation[] }> {
      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_group_conversations ORDER BY updated_at DESC',
      );
      const local = cached.map((r) => JSON.parse(r.data) as GroupConversation);

      if (network.isOnline()) {
        remote
          .listConversations()
          .then(async (result) => {
            for (const conv of result.conversations) {
              const id = (conv as Record<string, unknown>).id as string;
              if (!id) continue;
              await cache.run(
                "INSERT OR REPLACE INTO cached_group_conversations (id, data, updated_at) VALUES (?, ?, datetime('now'))",
                [id, JSON.stringify(conv)],
              );
            }
          })
          .catch((e) => logger.warn('CompositeGroupChat', 'Refresh failed', e));
      }

      if (local.length > 0) return { conversations: local };
      if (network.isOnline()) {
        const result = await remote.listConversations();
        for (const conv of result.conversations) {
          const id = (conv as Record<string, unknown>).id as string;
          if (!id) continue;
          await cache.run(
            "INSERT OR REPLACE INTO cached_group_conversations (id, data, updated_at) VALUES (?, ?, datetime('now'))",
            [id, JSON.stringify(conv)],
          );
        }
        return result;
      }
      return { conversations: [] };
    },

    async getMessages(eventId, cursor) {
      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_group_messages WHERE event_id = ? ORDER BY created_at ASC',
        [eventId],
      );
      const local = cached.map((r) => JSON.parse(r.data) as Serialized<GroupChatMessage>);

      if (network.isOnline()) {
        remote
          .getMessages(eventId, cursor)
          .then(async (result) => {
            for (const msg of result.messages) {
              await cache.run(
                'INSERT OR REPLACE INTO cached_group_messages (id, event_id, data, created_at) VALUES (?, ?, ?, ?)',
                [msg.id, eventId, JSON.stringify(msg), msg.createdAt],
              );
            }
          })
          .catch((e) => logger.warn('CompositeGroupChat', 'Message refresh failed', e));
      }

      if (local.length > 0) return { messages: local, nextCursor: null, hasMore: false };
      if (network.isOnline()) return remote.getMessages(eventId, cursor);
      return { messages: [], nextCursor: null, hasMore: false };
    },

    async sendMessage(eventId, content) {
      if (network.isOnline()) {
        const result = await remote.sendMessage(eventId, content);
        await cache.run(
          "INSERT OR REPLACE INTO cached_group_messages (id, event_id, data, created_at) VALUES (?, ?, ?, datetime('now'))",
          [result.message.id, eventId, JSON.stringify(result.message)],
        );
        return result;
      }

      const optimistic: Serialized<GroupChatMessage> = {
        id: `local_${Date.now()}`,
        eventId,
        senderId: 'self',
        content,
        createdAt: new Date().toISOString(),
      } as Serialized<GroupChatMessage>;

      await cache.run(
        "INSERT OR REPLACE INTO cached_group_messages (id, event_id, data, created_at) VALUES (?, ?, ?, datetime('now'))",
        [optimistic.id, eventId, JSON.stringify(optimistic)],
      );

      await syncQueue.enqueue({
        entityType: 'group_message',
        operation: 'create',
        endpoint: 'groupChat.sendMessage',
        payload: { eventId, content },
      });

      return { message: optimistic };
    },

    async markMessagesRead(eventId) {
      if (network.isOnline()) {
        await remote.markMessagesRead(eventId);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'group_message',
        operation: 'update',
        endpoint: 'groupChat.markMessagesRead',
        payload: { eventId },
      });
    },
  };
}
