import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useCallback, useRef, useState } from 'react';
import { container } from 'tsyringe';
import { useWebSocketListener } from '@/hooks/useWebSocket';
import { CHAT_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

function getChatRepo() {
  return container.resolve(CHAT_REPOSITORY);
}

type Message = RouterOutput['chat']['getMessages']['messages'][number];

/** Metadata for pending optimistic messages, keyed by temp ID. */
export interface PendingMeta {
  content: string;
  mediaUrl?: string;
  imageUri?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  kind: 'text' | 'image' | 'location';
}

export function useMessages(matchId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Stores metadata for retry of failed messages, keyed by temp ID
  const pendingMetaRef = useRef<Map<string, PendingMeta>>(new Map());

  const userId = useAuthStore((s) => s.user?.id);

  /** Create an optimistic Message object with status "sending". */
  const createOptimisticMessage = useCallback(
    (tempId: string, content: string, mediaUrl?: string): Message => ({
      id: tempId,
      matchId: matchId ?? '',
      senderId: userId ?? '',
      content,
      mediaUrl: mediaUrl ?? null,
      replyToId: null,
      replyTo: null,
      status: 'sending',
      isDeleted: false,
      createdAt: new Date().toISOString(),
    }),
    [matchId, userId],
  );

  /** Replace an optimistic message by temp ID with the real server message. */
  const replaceOptimistic = useCallback((tempId: string, real: Message) => {
    pendingMetaRef.current.delete(tempId);
    setMessages((prev) => prev.map((m) => (m.id === tempId ? real : m)));
  }, []);

  /** Mark an optimistic message as failed. */
  const markFailed = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)),
    );
  }, []);

  // Listen for incoming messages on the shared WebSocket
  useWebSocketListener((data) => {
    if (data.type === 'new_message') {
      const msg = data.payload as unknown as Message;
      if (matchId && msg.matchId === matchId) {
        // Avoid duplicating if we already have this message (from our own optimistic send)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }
  });

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    setLoadingMessages(true);
    try {
      const { messages: data } = await getChatRepo().getMessages(matchId);
      setMessages(data as Message[]);
    } catch (e) {
      logger.warn('useMessages', 'Failed to fetch messages', e);
    } finally {
      setLoadingMessages(false);
    }
  }, [matchId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!matchId) return;
    try {
      await getChatRepo().markMessagesRead(matchId);
    } catch (e) {
      logger.debug('useMessages', 'Failed to mark as read', e);
    }
  }, [matchId]);

  return {
    messages,
    loadingMessages,
    pendingMetaRef,
    fetchMessages,
    markAsRead,
    setMessages,
    createOptimisticMessage,
    replaceOptimistic,
    markFailed,
  };
}
