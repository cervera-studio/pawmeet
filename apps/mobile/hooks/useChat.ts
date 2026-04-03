import { useCallback, useEffect, useState } from 'react';
import { getIsConnected, onConnectionChange } from '@/hooks/useWebSocket';
import { useConversations } from './useConversations';
import { useMessageSender } from './useMessageSender';
import { useMessages } from './useMessages';
import { useTypingIndicator } from './useTypingIndicator';

export function useChat(matchId?: string) {
  const [connected, setConnected] = useState(getIsConnected);

  // Subscribe to connection state changes (no polling)
  useEffect(() => {
    return onConnectionChange(setConnected);
  }, []);

  const {
    conversations,
    loadingConversations,
    totalUnreadCount,
    fetchConversations,
    setConversations,
  } = useConversations();

  const {
    messages,
    loadingMessages,
    pendingMetaRef,
    fetchMessages,
    markAsRead: markAsReadMessages,
    setMessages,
    createOptimisticMessage,
    replaceOptimistic,
    markFailed,
  } = useMessages(matchId);

  const { sendMessage, sendImage, sendLocation, retrySend } = useMessageSender(matchId, {
    createOptimisticMessage,
    replaceOptimistic,
    markFailed,
    setMessages,
    pendingMetaRef,
  });

  const { isTyping, sendTyping } = useTypingIndicator(matchId);

  // When marking as read, also update conversation unread count
  const markAsRead = useCallback(async () => {
    await markAsReadMessages();
    if (matchId) {
      setConversations((prev) =>
        prev.map((c) => (c.matchId === matchId ? { ...c, unreadCount: 0 } : c)),
      );
    }
  }, [markAsReadMessages, matchId, setConversations]);

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
