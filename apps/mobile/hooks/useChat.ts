import type { RouterOutput } from '@dogwalk/api-client';
import type { WsMessage } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cache } from '@/lib/storage';
import { api } from '@/lib/trpc';
import { useAuthStore } from '@/stores/auth';

function getWsUrl(): string {
  const url = process.env.EXPO_PUBLIC_WS_URL;
  if (!url && !__DEV__) {
    throw new Error('EXPO_PUBLIC_WS_URL is required in production');
  }
  return url ?? 'ws://localhost:3000/ws';
}

const WS_URL = getWsUrl();

function buildWsUrl(baseUrl: string, token: string): { url: string; protocols: string[] } {
  // Never pass tokens as query params — use Sec-WebSocket-Protocol subprotocol
  return { url: baseUrl, protocols: [`access_token.${token}`] };
}
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://localhost:3000' : '');

const CONVERSATIONS_CACHE_KEY = 'cache:conversations';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];
type Message = RouterOutput['chat']['getMessages']['messages'][number];

export function useChat(matchId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  // Hydrate conversations from cache (stale-while-revalidate)
  const [conversations, setConversations] = useState<Conversation[]>(
    () => cache.get<Conversation[]>(CONVERSATIONS_CACHE_KEY) ?? [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    const { url, protocols } = buildWsUrl(WS_URL, token);
    const ws = new WebSocket(url, protocols);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        switch (data.type) {
          case 'new_message': {
            const msg = data.payload as unknown as Message;
            if (matchId && msg.matchId === matchId) {
              setMessages((prev) => [...prev, msg]);
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.matchId === msg.matchId
                  ? {
                      ...c,
                      lastMessage: msg,
                      unreadCount: msg.senderId !== userId ? c.unreadCount + 1 : c.unreadCount,
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
      } catch (e) {
        logger.debug('useChat', 'Malformed WS message', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, matchId, userId]);

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

  // Send text message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!matchId || !content.trim()) return;
      try {
        const { message: msg } = await api.chat.sendMessage.mutate({ matchId, content });
        setMessages((prev) => [...prev, msg]);
        // Also send via WS for real-time
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch (e) {
        logger.warn('useChat', 'Failed to send message', e);
      }
    },
    [matchId],
  );

  // Send image message
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (!matchId) return;
      try {
        // Upload image first (tRPC doesn't handle file uploads)
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'chat-image.jpg',
        } as unknown as Blob);

        const uploadResponse = await fetch(`${API_URL}/api/chat/${matchId}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const { mediaUrl } = await uploadResponse.json();

        // Send message with media URL via tRPC
        const { message: msg } = await api.chat.sendMessage.mutate({
          matchId,
          content: '',
          mediaUrl,
        });
        setMessages((prev) => [...prev, msg]);
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch (e) {
        logger.error('useChat', 'Failed to send image', e);
      }
    },
    [matchId, token],
  );

  // Send location message
  const sendLocation = useCallback(
    async (latitude: number, longitude: number, label?: string) => {
      if (!matchId) return;
      try {
        const content = JSON.stringify({ type: 'location', latitude, longitude, label });
        const { message: msg } = await api.chat.sendMessage.mutate({ matchId, content });
        setMessages((prev) => [...prev, msg]);
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch (e) {
        logger.warn('useChat', 'Failed to send location', e);
      }
    },
    [matchId],
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!matchId) return;
      wsRef.current?.send(
        JSON.stringify({ type: typing ? 'typing_start' : 'typing_stop', payload: { matchId } }),
      );
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

  return {
    connected,
    messages,
    conversations,
    isTyping,
    loadingMessages,
    loadingConversations,
    fetchConversations,
    fetchMessages,
    sendMessage,
    sendImage,
    sendLocation,
    sendTyping,
    markAsRead,
  };
}
