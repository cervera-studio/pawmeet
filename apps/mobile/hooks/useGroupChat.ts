import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

type GroupConversation = RouterOutput['groupChat']['listConversations']['conversations'][number];
type GroupMessage = RouterOutput['groupChat']['getMessages']['messages'][number];

export type { GroupConversation, GroupMessage };

export function useGroupChat(eventId?: string) {
  const [conversations, setConversations] = useState<GroupConversation[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { conversations: data } = await api.groupChat.listConversations.query();
      setConversations(data);
    } catch (e) {
      logger.warn('useGroupChat', 'Failed to fetch group conversations', e);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const fetchMessages = useCallback(
    async (cursor?: string) => {
      if (!eventId) return;
      setLoadingMessages(true);
      try {
        const result = await api.groupChat.getMessages.query({
          eventId,
          cursor,
        });
        if (cursor) {
          // Append older messages (pagination)
          setMessages((prev) => [...result.messages, ...prev]);
        } else {
          setMessages(result.messages);
        }
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (e) {
        logger.warn('useGroupChat', 'Failed to fetch group messages', e);
      } finally {
        setLoadingMessages(false);
      }
    },
    [eventId],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!(eventId && content.trim())) return;
      try {
        const { message } = await api.groupChat.sendMessage.mutate({
          eventId,
          content,
        });
        setMessages((prev) => [...prev, message]);
        return message;
      } catch (e) {
        logger.warn('useGroupChat', 'Failed to send group message', e);
        return null;
      }
    },
    [eventId],
  );

  const markAsRead = useCallback(async () => {
    if (!eventId) return;
    try {
      await api.groupChat.markMessagesRead.mutate({ eventId });
    } catch (e) {
      logger.debug('useGroupChat', 'Failed to mark group messages as read', e);
    }
  }, [eventId]);

  const loadMore = useCallback(async () => {
    if (!(hasMore && nextCursor) || loadingMessages) return;
    await fetchMessages(nextCursor);
  }, [hasMore, nextCursor, loadingMessages, fetchMessages]);

  return {
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    hasMore,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    loadMore,
  };
}
