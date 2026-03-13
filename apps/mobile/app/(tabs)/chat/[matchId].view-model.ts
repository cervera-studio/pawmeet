import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FlatList } from 'react-native';
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
  } = useChat(validMatchId);
  const { coordinates, getCurrentLocation } = useLocation();
  const { proposeWalk } = useWalks();
  const [text, setText] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
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
    // Send typing indicator
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(text.trim());
    setText('');
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [text, sendMessage, sendTyping]);

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

  const renderItem = useCallback(
    ({ item }: { item: (typeof messages)[number] }) => ({
      text: item.content,
      isMine: item.senderId === userId,
      timestamp: formatTime(item.createdAt),
      mediaUrl: item.mediaUrl,
      status: item.senderId === userId ? item.status : undefined,
    }),
    [userId],
  );

  const hasText = text.trim().length > 0;

  return {
    matchId: validMatchId,
    paramError,
    userId,
    messages,
    isTyping,
    connected,
    loadingMessages,
    text,
    showAttachments,
    showWalkModal,
    flatListRef,
    hasText,
    handleTextChange,
    handleSend,
    handlePickImage,
    handleSendLocation,
    toggleAttachments,
    openWalkModal,
    closeWalkModal,
    handleProposeWalk,
    renderItem,
  };
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
