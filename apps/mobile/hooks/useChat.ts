import process from 'node:process';
import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSharedWs, useWebSocketListener } from '@/hooks/useWebSocket';
import { cache } from '@/lib/storage';
import { api } from '@/lib/trpc';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:3000' : '');

const CONVERSATIONS_CACHE_KEY = 'cache:conversations';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];
type Message = RouterOutput['chat']['getMessages']['messages'][number];

const MAX_UPLOAD_RETRIES = 3;

/** Upload an image with exponential-backoff retry. Returns the media URL. */
async function uploadImage(
  matchId: string,
  imageUri: string,
  token: string | null,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'chat-image.jpg',
  } as unknown as Blob);

  let uploadResponse: Response | null = null;

  for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt++) {
    try {
      uploadResponse = await fetch(`${API_URL}/api/chat/${matchId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (uploadResponse.ok) break;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (
        uploadResponse.status >= 400 &&
        uploadResponse.status < 500 &&
        uploadResponse.status !== 429
      ) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
    } catch (e) {
      // Network error — retry unless it's the last attempt
      if (attempt === MAX_UPLOAD_RETRIES - 1) throw e;
    }

    // Exponential backoff: 1s, 2s, 4s
    const backoff = 1000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, backoff));
    logger.debug('useChat', `Retrying upload (attempt ${attempt + 2}/${MAX_UPLOAD_RETRIES})`);
  }

  if (!uploadResponse?.ok) {
    throw new Error(
      `Upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${uploadResponse?.status}`,
    );
  }

  const body: unknown = await uploadResponse.json();

  // Validate response shape
  if (
    !body ||
    typeof body !== 'object' ||
    !('mediaUrl' in body) ||
    typeof (body as Record<string, unknown>).mediaUrl !== 'string'
  ) {
    throw new Error('Upload response missing mediaUrl');
  }

  return (body as { mediaUrl: string }).mediaUrl;
}

/** Send a tRPC chat message and broadcast it over WebSocket. */
async function sendChatMessage(
  matchId: string,
  content: string,
  mediaUrl?: string,
  replyToId?: string,
): Promise<Message> {
  const { message: msg } = await api.chat.sendMessage.mutate({
    matchId,
    content,
    mediaUrl,
    replyToId,
  });
  getSharedWs()?.send(JSON.stringify({ type: 'message', payload: msg }));
  return msg;
}

/** Build a location-sharing message content string with coordinate rounding. */
function buildLocationContent(latitude: number, longitude: number, label?: string): string {
  const roundedLat = Math.round(latitude * 200) / 200;
  const roundedLng = Math.round(longitude * 200) / 200;
  return JSON.stringify({
    type: 'location',
    latitude: roundedLat,
    longitude: roundedLng,
    label,
  });
}

/** Send a typing indicator over WebSocket. */
function emitTypingIndicator(matchId: string, typing: boolean): void {
  getSharedWs()?.send(
    JSON.stringify({
      type: typing ? 'typing_start' : 'typing_stop',
      payload: { matchId },
    }),
  );
}

/** Metadata for pending optimistic messages, keyed by temp ID. */
interface PendingMeta {
  content: string;
  mediaUrl?: string;
  imageUri?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  kind: 'text' | 'image' | 'location';
}

export function useChat(matchId?: string) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // Hydrate conversations from cache (stale-while-revalidate)
  const [conversations, setConversations] = useState<Conversation[]>(
    () => cache.get<Conversation[]>(CONVERSATIONS_CACHE_KEY) ?? [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Stores metadata for retry of failed messages, keyed by temp ID
  const pendingMetaRef = useRef<Map<string, PendingMeta>>(new Map());

  // Track shared WS connection state
  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(getSharedWs()?.readyState === WebSocket.OPEN);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const token = useAuthStore((s) => s.token);
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

  // Listen for chat events on the shared WebSocket
  useWebSocketListener((data) => {
    switch (data.type) {
      case 'new_message': {
        const msg = data.payload as unknown as Message;
        if (matchId && msg.matchId === matchId) {
          // Avoid duplicating if we already have this message (from our own optimistic send)
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
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
        break;
      }
      case 'typing_start':
      case 'typing_stop': {
        const typingMatchId = data.payload.matchId as string;
        if (matchId && typingMatchId === matchId) {
          setIsTyping(data.type === 'typing_start');
        }
        break;
      }
      case 'online_status': {
        // Online presence tracked via WS but not persisted in conversation type
        break;
      }
    }
  });

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const { conversations: data } = await api.chat.listConversations.query();
      setConversations(data);
      cache.set(CONVERSATIONS_CACHE_KEY, data);
    } catch (e) {
      logger.warn('useChat', 'Failed to fetch conversations', e);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    setLoadingMessages(true);
    try {
      const { messages: data } = await api.chat.getMessages.query({ matchId });
      setMessages(data);
    } catch (e) {
      logger.warn('useChat', 'Failed to fetch messages', e);
    } finally {
      setLoadingMessages(false);
    }
  }, [matchId]);

  // Send text message (optimistic)
  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      if (!(matchId && content.trim())) return;
      const tempId = Crypto.randomUUID();
      const optimistic = createOptimisticMessage(tempId, content);
      pendingMetaRef.current.set(tempId, { content, kind: 'text' });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const msg = await sendChatMessage(matchId, content, undefined, replyToId);
        replaceOptimistic(tempId, msg);
      } catch (e) {
        logger.warn('useChat', 'Failed to send message', e);
        markFailed(tempId);
      }
    },
    [matchId, createOptimisticMessage, replaceOptimistic, markFailed],
  );

  // Send image message (optimistic)
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (!matchId) return;
      const tempId = Crypto.randomUUID();
      const optimistic = createOptimisticMessage(tempId, '', imageUri);
      pendingMetaRef.current.set(tempId, { content: '', imageUri, kind: 'image' });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const mediaUrl = await uploadImage(matchId, imageUri, token);
        const msg = await sendChatMessage(matchId, '', mediaUrl);
        replaceOptimistic(tempId, msg);
      } catch (e) {
        logger.error('useChat', 'Failed to send image', e);
        markFailed(tempId);
      }
    },
    [matchId, token, createOptimisticMessage, replaceOptimistic, markFailed],
  );

  // Send location message (optimistic)
  const sendLocation = useCallback(
    async (latitude: number, longitude: number, label?: string) => {
      if (!matchId) return;
      const tempId = Crypto.randomUUID();
      const content = buildLocationContent(latitude, longitude, label);
      const optimistic = createOptimisticMessage(tempId, content);
      pendingMetaRef.current.set(tempId, {
        content,
        latitude,
        longitude,
        locationLabel: label,
        kind: 'location',
      });
      setMessages((prev) => [...prev, optimistic]);

      try {
        const msg = await sendChatMessage(matchId, content);
        replaceOptimistic(tempId, msg);
      } catch (e) {
        logger.warn('useChat', 'Failed to send location', e);
        markFailed(tempId);
      }
    },
    [matchId, createOptimisticMessage, replaceOptimistic, markFailed],
  );

  // Retry a failed message
  const retrySend = useCallback(
    async (tempId: string) => {
      if (!matchId) return;
      const meta = pendingMetaRef.current.get(tempId);
      if (!meta) return;

      // Reset status back to "sending"
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sending' as const } : m)),
      );

      try {
        let msg: Message;
        switch (meta.kind) {
          case 'image': {
            const mediaUrl = await uploadImage(matchId, meta.imageUri!, token);
            msg = await sendChatMessage(matchId, '', mediaUrl);
            break;
          }
          case 'location':
          case 'text': {
            msg = await sendChatMessage(matchId, meta.content);
            break;
          }
        }
        replaceOptimistic(tempId, msg);
      } catch (e) {
        logger.warn('useChat', `Failed to retry message ${tempId}`, e);
        markFailed(tempId);
      }
    },
    [matchId, token, replaceOptimistic, markFailed],
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!matchId) return;
      emitTypingIndicator(matchId, typing);
    },
    [matchId],
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!matchId) return;
    try {
      await api.chat.markMessagesRead.mutate({ matchId });
      setConversations((prev) =>
        prev.map((c) => (c.matchId === matchId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch (e) {
      logger.debug('useChat', 'Failed to mark as read', e);
    }
  }, [matchId]);

  // Compute total unread count across all conversations
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    connected,
    messages,
    conversations,
    isTyping,
    loadingMessages,
    loadingConversations,
    totalUnreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendImage,
    sendLocation,
    sendTyping,
    markAsRead,
    retrySend,
  };
}
