import type { ChatMessage, Serialized } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type {
  ChatRepository,
  Conversation,
  LocalCache,
  NetworkState,
  SyncQueue,
} from '../interfaces';

interface CompositeChatDeps {
  remote: ChatRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

/**
 * Composite ChatRepository: reads from SQLite first (instant), then syncs with remote.
 * Writes go to remote when online, or are queued for sync when offline.
 *
 * All infrastructure dependencies are injected — no direct imports of
 * getDatabase(), isOnline(), or enqueueMutation().
 */
export function createCompositeChatRepository(deps: CompositeChatDeps): ChatRepository {
  const { remote, cache, network, syncQueue } = deps;

  return {
    async listConversations(): Promise<{ conversations: Conversation[] }> {
      const cached = await cache.getAll<{ id: string; data: string }>(
        'SELECT * FROM cached_conversations ORDER BY updated_at DESC',
      );
      const localConversations = cached.map((row) => JSON.parse(row.data) as Conversation);

      // Background refresh from remote
      if (network.isOnline()) {
        remote
          .listConversations()
          .then(async (result) => {
            for (const conv of result.conversations) {
              const id = (conv as Record<string, unknown>).id as string;
              if (!id) continue;
              await cache.run(
                `INSERT OR REPLACE INTO cached_conversations (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
                [id, JSON.stringify(conv)],
              );
            }
          })
          .catch((e) => logger.warn('CompositeChat', 'Background refresh failed', e));
      }

      if (localConversations.length > 0) {
        return { conversations: localConversations };
      }

      if (network.isOnline()) {
        const result = await remote.listConversations();
        for (const conv of result.conversations) {
          const id = (conv as Record<string, unknown>).id as string;
          if (!id) continue;
          await cache.run(
            `INSERT OR REPLACE INTO cached_conversations (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
            [id, JSON.stringify(conv)],
          );
        }
        return result;
      }

      return { conversations: [] };
    },

    async getMessages(matchId: string): Promise<{ messages: Serialized<ChatMessage>[] }> {
      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_messages WHERE match_id = ? ORDER BY created_at ASC',
        [matchId],
      );
      const localMessages = cached.map((row) => JSON.parse(row.data) as Serialized<ChatMessage>);

      if (network.isOnline()) {
        remote
          .getMessages(matchId)
          .then(async (result) => {
            for (const msg of result.messages) {
              await cache.run(
                `INSERT OR REPLACE INTO cached_messages (id, match_id, data, created_at) VALUES (?, ?, ?, ?)`,
                [msg.id, matchId, JSON.stringify(msg), msg.createdAt],
              );
            }
          })
          .catch((e) => logger.warn('CompositeChat', 'Message refresh failed', e));
      }

      if (localMessages.length > 0) {
        return { messages: localMessages };
      }

      if (network.isOnline()) {
        const result = await remote.getMessages(matchId);
        for (const msg of result.messages) {
          await cache.run(
            `INSERT OR REPLACE INTO cached_messages (id, match_id, data, created_at) VALUES (?, ?, ?, ?)`,
            [msg.id, matchId, JSON.stringify(msg), msg.createdAt],
          );
        }
        return result;
      }

      return { messages: [] };
    },

    async sendMessage(params): Promise<{ message: Serialized<ChatMessage> }> {
      if (network.isOnline()) {
        const result = await remote.sendMessage(params);
        await cache.run(
          `INSERT OR REPLACE INTO cached_messages (id, match_id, data, created_at) VALUES (?, ?, ?, datetime('now'))`,
          [result.message.id, params.matchId, JSON.stringify(result.message)],
        );
        return result;
      }

      // Offline: optimistic local message + sync queue
      const optimisticMessage: Serialized<ChatMessage> = {
        id: `local_${Date.now()}`,
        matchId: params.matchId,
        senderId: 'self',
        content: params.content,
        mediaUrl: params.mediaUrl ?? null,
        status: 'sent',
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      await cache.run(
        `INSERT OR REPLACE INTO cached_messages (id, match_id, data, created_at) VALUES (?, ?, ?, datetime('now'))`,
        [optimisticMessage.id, params.matchId, JSON.stringify(optimisticMessage)],
      );

      await syncQueue.enqueue({
        entityType: 'message',
        operation: 'create',
        endpoint: 'chat.sendMessage',
        payload: params,
      });

      return { message: optimisticMessage };
    },

    async markMessagesRead(matchId: string): Promise<void> {
      if (network.isOnline()) {
        await remote.markMessagesRead(matchId);
        return;
      }

      await syncQueue.enqueue({
        entityType: 'message',
        operation: 'update',
        endpoint: 'chat.markMessagesRead',
        payload: { matchId },
      });
    },

    async uploadImage(matchId: string, imageUri: string): Promise<{ mediaUrl: string }> {
      if (!network.isOnline()) {
        throw new Error('Caricamento immagini richiede connessione');
      }
      return remote.uploadImage(matchId, imageUri);
    },
  };
}
