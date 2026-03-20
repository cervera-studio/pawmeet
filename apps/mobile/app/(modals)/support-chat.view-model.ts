import type { RouterOutput } from '@pawmeet/api-client';
import type { WsMessage } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useWebSocketListener } from '@/hooks/useWebSocket';
import { api } from '@/lib/trpc';
import { enqueueMutation } from '@/services/sync-engine';

type Message = RouterOutput['support']['getTicketMessages']['messages'][number];
type MyTicket = RouterOutput['support']['listMyTickets'][number];

export function useSupportChatViewModel() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<MyTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');

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

  // Initial fetch
  useEffect(() => {
    void fetchMessages();
    void fetchTicket();
  }, [fetchMessages, fetchTicket]);

  // Real-time: listen for new support messages via WebSocket
  useWebSocketListener(
    useCallback(
      (wsMsg: WsMessage) => {
        if (wsMsg.type !== 'support_new_message') return;
        if (wsMsg.payload.ticketId !== ticketId) return;

        const raw = wsMsg.payload.message;
        const incoming: Message = {
          ...raw,
          createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : String(raw.createdAt),
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      },
      [ticketId],
    ),
  );

  const handleSend = useCallback(async () => {
    if (!(ticketId && inputText.trim()) || sending) return;

    const content = inputText.trim();
    setSending(true);
    setInputText('');

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
  }, [ticketId, inputText, sending, fetchMessages]);

  return {
    ticketId,
    ticket,
    messages,
    loading,
    sending,
    inputText,
    setInputText,
    isClosed,
    handleSend,
  };
}
