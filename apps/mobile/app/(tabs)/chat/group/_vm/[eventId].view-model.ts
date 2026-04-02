import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { useGroupChat } from '@/hooks/useGroupChat';
import { isValidUUID } from '@/lib/deep-link-validation';
import { getDateLocale } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';

export function useGroupChatConversationViewModel() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [paramError, setParamError] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  // Validate deep link param
  useEffect(() => {
    if (eventId && !isValidUUID(eventId)) {
      setParamError('ID evento non valido');
    }
  }, [eventId]);

  const validEventId = eventId && isValidUUID(eventId) ? eventId : undefined;

  const { messages, loadingMessages, hasMore, fetchMessages, sendMessage, markAsRead, loadMore } =
    useGroupChat(validEventId);

  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    void fetchMessages();
    void markAsRead();
  }, [fetchMessages, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleTextChange = (value: string) => {
    setText(value);
  };

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendMessage(text.trim());
    setText('');
  }, [text, sendMessage]);

  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => ({
      text: item.content,
      isMine: item.senderId === userId,
      timestamp: formatTime(item.createdAt),
      senderId: item.senderId,
      mediaUrl: item.mediaUrl,
    }),
    [userId],
  );

  const hasText = text.trim().length > 0;

  return {
    eventId: validEventId,
    paramError,
    userId,
    messages,
    loadingMessages,
    hasMore,
    text,
    flatListRef,
    hasText,
    handleTextChange,
    handleSend,
    handleLoadMore,
    renderItem,
  };
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
}
