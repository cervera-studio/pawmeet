import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@dogwalk/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000/ws';

interface WsMessage {
  type: 'message' | 'typing' | 'read' | 'online';
  payload: unknown;
}

export interface Conversation {
  matchId: string;
  dogName: string;
  ownerName: string;
  ownerId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOnline: boolean;
}

export function useChat(matchId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);

  // Connect WebSocket
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        switch (data.type) {
          case 'message': {
            const msg = data.payload as ChatMessage;
            if (matchId && msg.matchId === matchId) {
              setMessages((prev) => [...prev, msg]);
            }
            // Update conversation list last message
            setConversations((prev) =>
              prev.map((c) =>
                c.matchId === msg.matchId
                  ? {
                      ...c,
                      lastMessage: msg.content,
                      lastMessageAt: String(msg.createdAt),
                      unreadCount: msg.senderId !== userId ? c.unreadCount + 1 : c.unreadCount,
                    }
                  : c,
              ),
            );
            break;
          }
          case 'typing': {
            const { matchId: typingMatchId, isTyping: typing } = data.payload as {
              matchId: string;
              isTyping: boolean;
            };
            if (matchId && typingMatchId === matchId) {
              setIsTyping(typing);
            }
            break;
          }
          case 'online': {
            const { userId: onlineUserId, isOnline } = data.payload as {
              userId: string;
              isOnline: boolean;
            };
            setConversations((prev) =>
              prev.map((c) => (c.ownerId === onlineUserId ? { ...c, isOnline } : c)),
            );
            break;
          }
        }
      } catch {
        // Ignore malformed messages
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
      const data = await api.get<Conversation[]>('/chat/conversations');
      setConversations(data);
    } catch {
      // Silently fail
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    setLoadingMessages(true);
    try {
      const data = await api.get<ChatMessage[]>(`/chat/${matchId}/messages`);
      setMessages(data);
    } catch {
      // Silently fail
    } finally {
      setLoadingMessages(false);
    }
  }, [matchId]);

  // Send text message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!matchId || !content.trim()) return;
      try {
        const msg = await api.post<ChatMessage>(`/chat/${matchId}/messages`, { content });
        setMessages((prev) => [...prev, msg]);
        // Also send via WS for real-time
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch {
        // Silently fail
      }
    },
    [matchId],
  );

  // Send image message
  const sendImage = useCallback(
    async (imageUri: string) => {
      if (!matchId) return;
      try {
        // Upload image first
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'chat-image.jpg',
        } as unknown as Blob);

        const uploadResponse = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/chat/${matchId}/upload`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );
        const { mediaUrl } = await uploadResponse.json();

        // Send message with media URL
        const msg = await api.post<ChatMessage>(`/chat/${matchId}/messages`, {
          content: '',
          mediaUrl,
        });
        setMessages((prev) => [...prev, msg]);
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch {
        // Silently fail
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
        const msg = await api.post<ChatMessage>(`/chat/${matchId}/messages`, { content });
        setMessages((prev) => [...prev, msg]);
        wsRef.current?.send(JSON.stringify({ type: 'message', payload: msg }));
      } catch {
        // Silently fail
      }
    },
    [matchId],
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!matchId) return;
      wsRef.current?.send(
        JSON.stringify({ type: 'typing', payload: { matchId, isTyping: typing } }),
      );
    },
    [matchId],
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!matchId) return;
    try {
      await api.post(`/chat/${matchId}/read`, {});
      setConversations((prev) =>
        prev.map((c) => (c.matchId === matchId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch {
      // Silently fail
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
