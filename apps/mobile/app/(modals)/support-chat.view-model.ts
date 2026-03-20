import type { RouterOutput } from '@pawmeet/api-client';
import type { WsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSharedWs, useWebSocketListener } from '@/hooks/useWebSocket';
import { api } from '@/lib/trpc';
import { enqueueMutation } from '@/services/sync-engine';

type Message = RouterOutput['support']['getTicketMessages']['messages'][number];
type MyTicket = RouterOutput['support']['listMyTickets'][number];

const TYPING_DEBOUNCE_MS = 2000;

export function useSupportChatViewModel() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<MyTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typing debounce timer ref
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const isClosed = ticket?.status === 'resolved' || ticket?.status === 'closed';

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await api.support.getTicketMessages.query({ ticketId });
      setMessages(data.messages);
    } catch (e) {
      logger.warn('SupportChat', 'Failed to fetch messages', e);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const tickets = await api.support.listMyTickets.query();
      const found = tickets.find((t) => t.id === ticketId);
      if (found) setTicket(found);
    } catch (e) {
      logger.warn('SupportChat', 'Failed to fetch ticket', e);
    }
  }, [ticketId]);

  // Mark admin messages as read when entering the chat
  const markAsRead = useCallback(async () => {
    if (!ticketId) return;
    try {
      await api.support.markAsRead.mutate({ ticketId });
    } catch (e) {
      logger.debug('SupportChat', 'Failed to mark as read', e);
    }
  }, [ticketId]);

  // Initial fetch + mark as read
  useEffect(() => {
    void fetchMessages();
    void fetchTicket();
    void markAsRead();
  }, [fetchMessages, fetchTicket, markAsRead]);

  // Real-time: listen for support WS events
  useWebSocketListener(
    useCallback(
      (wsMsg: WsMessage) => {
        if (wsMsg.type === 'support_new_message') {
          if (wsMsg.payload.ticketId !== ticketId) return;

          const raw = wsMsg.payload.message;
          const incoming: Message = {
            ...raw,
            createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : String(raw.createdAt),
            readAt: raw.readAt
              ? typeof raw.readAt === 'string'
                ? raw.readAt
                : String(raw.readAt)
              : null,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          // Auto-mark as read when we receive a new admin message while chat is open
          if (raw.senderType === 'admin') {
            void markAsRead();
          }
        } else if (wsMsg.type === 'support_typing_start') {
          if (wsMsg.payload.ticketId === ticketId) {
            setIsTyping(true);
          }
        } else if (wsMsg.type === 'support_typing_stop') {
          if (wsMsg.payload.ticketId === ticketId) {
            setIsTyping(false);
          }
        } else if (wsMsg.type === 'support_messages_read' && wsMsg.payload.ticketId === ticketId) {
          // Mark all user messages as read
          const readAt = wsMsg.payload.readAt;
          setMessages((prev) =>
            prev.map((m) => (m.senderType === 'user' && !m.readAt ? { ...m, readAt } : m)),
          );
        }
      },
      [ticketId, markAsRead],
    ),
  );

  /** Emit typing indicator via WebSocket with debounce */
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!ticketId) return;

      if (typing && !isTypingRef.current) {
        isTypingRef.current = true;
        getSharedWs()?.send(
          JSON.stringify({
            type: 'support_typing_start',
            payload: { ticketId },
          }),
        );
      }

      // Reset the stop timer
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      if (typing) {
        // Auto-stop after debounce
        typingTimerRef.current = setTimeout(() => {
          isTypingRef.current = false;
          getSharedWs()?.send(
            JSON.stringify({
              type: 'support_typing_stop',
              payload: { ticketId },
            }),
          );
        }, TYPING_DEBOUNCE_MS);
      } else if (isTypingRef.current) {
        isTypingRef.current = false;
        getSharedWs()?.send(
          JSON.stringify({
            type: 'support_typing_stop',
            payload: { ticketId },
          }),
        );
      }
    },
    [ticketId],
  );

  // Clean up typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (isTypingRef.current && ticketId) {
        getSharedWs()?.send(
          JSON.stringify({
            type: 'support_typing_stop',
            payload: { ticketId },
          }),
        );
      }
    };
  }, [ticketId]);

  /** Wrapper for setInputText that also emits typing indicator */
  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      sendTyping(text.length > 0);
    },
    [sendTyping],
  );

  const handleSend = useCallback(async () => {
    if (!(ticketId && inputText.trim()) || sending) return;

    const content = inputText.trim();
    setSending(true);
    setInputText('');
    sendTyping(false);

    try {
      await enqueueMutation({
        entityType: 'support_message',
        operation: 'create',
        endpoint: 'support.sendMessage',
        payload: { ticketId, content },
      });
      // Refetch to get the sent message with proper shape
      await fetchMessages();
    } catch (e) {
      logger.warn('SupportChat', 'Failed to enqueue message', e);
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [ticketId, inputText, sending, fetchMessages, sendTyping]);

  return {
    ticketId,
    ticket,
    messages,
    loading,
    sending,
    inputText,
    setInputText: handleInputChange,
    isClosed,
    isTyping,
    handleSend,
    sendTyping,
  };
}
