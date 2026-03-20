import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/trpc';

type Message = RouterOutput['support']['getTicketMessages']['messages'][number];
type MyTicket = RouterOutput['support']['listMyTickets'][number];

const POLL_INTERVAL_MS = 30_000;

export function useSupportChatViewModel() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticket, setTicket] = useState<MyTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [fetchMessages]);

  // Poll for new messages
  useEffect(() => {
    pollRef.current = setInterval(() => {
      void fetchMessages();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    if (!(ticketId && inputText.trim()) || sending) return;

    const content = inputText.trim();
    setSending(true);
    setInputText('');

    try {
      const result = await api.support.sendMessage.mutate({ ticketId, content });
      // Refetch to get the new message with proper shape
      await fetchMessages();
    } catch (e) {
      logger.warn('SupportChat', 'Failed to send message', e);
      // Restore input on failure
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [ticketId, inputText, sending]);

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
