import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { container } from 'tsyringe';
import { useWebSocketListener } from '@/hooks/useWebSocket';
import { cache } from '@/lib/storage';
import { CHAT_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const chatRepo = container.resolve(CHAT_REPOSITORY);

const CONVERSATIONS_CACHE_KEY = 'cache:conversations';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];
type Message = RouterOutput['chat']['getMessages']['messages'][number];

export function useConversations() {
  // Hydrate conversations from cache (stale-while-revalidate)
  const [conversations, setConversations] = useState<Conversation[]>(
    () => cache.get<Conversation[]>(CONVERSATIONS_CACHE_KEY) ?? [],
  );
  const [loadingConversations, setLoadingConversations] = useState(false);

  const userId = useAuthStore((s) => s.user?.id);

  // Listen for chat events that affect conversations
  useWebSocketListener((data) => {
    if (data.type === 'new_message') {
      const msg = data.payload as unknown as Message;
      setConversations((prev) =>
        prev.map((c) =>
          c.matchId === msg.matchId
            ? {
                ...c,
                lastMessage: msg,
                unreadCount: msg.senderId === userId ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        ),
      );
    }
  });

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { conversations: data } = await chatRepo.listConversations();
      setConversations(data as Conversation[]);
      cache.set(CONVERSATIONS_CACHE_KEY, data);
    } catch (e) {
      logger.warn('useConversations', 'Failed to fetch conversations', e);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Compute total unread count across all conversations
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    loadingConversations,
    totalUnreadCount,
    fetchConversations,
    setConversations,
  };
}
