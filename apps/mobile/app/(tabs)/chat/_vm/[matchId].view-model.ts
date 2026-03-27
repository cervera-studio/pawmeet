import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
import { useAnalyticsService } from '@/hooks/useAnalytics';
import { useChat } from '@/hooks/useChat';
import { useLocation } from '@/hooks/useLocation';
import { useWalks } from '@/hooks/useWalks';
import { isValidUUID } from '@/lib/deep-link-validation';
import { useAuthStore } from '@/stores/auth';

export function useChatConversationViewModel() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [paramError, setParamError] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  // Validate deep link param
  useEffect(() => {
    if (matchId && !isValidUUID(matchId)) {
      setParamError('ID conversazione non valido');
    }
  }, [matchId]);

  const validMatchId = matchId && isValidUUID(matchId) ? matchId : undefined;
  const analytics = useAnalyticsService();
  const chatOpenTrackedRef = useRef(false);

  const {
    messages,
    isTyping,
    connected,
    loadingMessages,
    fetchMessages,
    sendMessage,
    sendImage,
    sendLocation,
    sendTyping,
    markAsRead,
    retrySend,
  } = useChat(validMatchId);
  const { coordinates, getCurrentLocation } = useLocation();
  const { proposeWalk } = useWalks();
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reply mode
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);

  // Search mode
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
    markAsRead();

    // Track chat_opened once per mount
    if (!chatOpenTrackedRef.current && validMatchId) {
      chatOpenTrackedRef.current = true;
      analytics.track('chat_opened', {
        matchAgeDays: 0, // Would need match creation date for accuracy
        isFirstOpen: messages.length === 0,
      });
    }
  }, [fetchMessages, markAsRead, validMatchId, analytics, messages.length]);

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
    // Send typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(text.trim(), replyingTo?.id);
    setText('');
    setReplyingTo(null);
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [text, sendMessage, sendTyping, replyingTo]);

  const handlePickImage = useCallback(async () => {
    setShowAttachments(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      sendImage(result.assets[0].uri);
    }
  }, [sendImage]);

  const handleSendLocation = useCallback(async () => {
    setShowAttachments(false);
    let coords = coordinates;
    if (!coords) {
      coords = await getCurrentLocation();
    }
    if (coords) {
      sendLocation(coords.latitude, coords.longitude, 'Punto di incontro');
    }
  }, [coordinates, getCurrentLocation, sendLocation]);

  const toggleAttachments = useCallback(() => {
    setShowAttachments((prev) => !prev);
  }, []);

  const openWalkModal = useCallback(() => {
    setShowAttachments(false);
    setShowWalkModal(true);
  }, []);

  const closeWalkModal = useCallback(() => {
    setShowWalkModal(false);
  }, []);

  const handleProposeWalk = useCallback(
    async (input: Parameters<typeof proposeWalk>[0]) => {
      await proposeWalk(input);
    },
    [proposeWalk],
  );

  // Reply handlers
  const handleReply = useCallback(
    (message: (typeof messages)[number]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // In a 1:1 chat, "Tu" for own messages; for the other person we use
      // the senderName already resolved by the API on the replyTo preview
      // of previous messages, or fall back to empty (the banner is ephemeral).
      const senderName = message.senderId === userId ? 'Tu' : '';
      setReplyingTo({
        id: message.id,
        content: message.content,
        senderName,
      });
    },
    [userId],
  );

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Search handlers
  const toggleSearch = useCallback(() => {
    setSearchActive((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const filteredMessages = useMemo(() => {
    if (!(searchActive && searchQuery.trim())) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchActive, searchQuery]);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = messages.findIndex((m) => m.id === messageId);
      if (index >= 0) {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    },
    [messages],
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => ({
      text: item.content,
      isMine: item.senderId === userId,
      timestamp: formatTime(item.createdAt),
      mediaUrl: item.mediaUrl,
      status: item.senderId === userId ? item.status : undefined,
      replyTo: item.replyTo ?? undefined,
    }),
    [userId],
  );

  const hasText = text.trim().length > 0;

  return {
    matchId: validMatchId,
    paramError,
    userId,
    messages,
    filteredMessages,
    isTyping,
    connected,
    loadingMessages,
    text,
    showAttachments,
    showWalkModal,
    flatListRef,
    hasText,
    // Reply
    replyingTo,
    handleReply,
    cancelReply,
    // Search
    searchActive,
    searchQuery,
    setSearchQuery,
    toggleSearch,
    scrollToMessage,
    // Actions
    handleTextChange,
    handleSend,
    handlePickImage,
    handleSendLocation,
    toggleAttachments,
    openWalkModal,
    closeWalkModal,
    handleProposeWalk,
    renderItem,
    retrySend,
  };
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
