import type { RouterOutput } from '@dogwalk/api-client';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useChat } from '@/hooks/useChat';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];

export type { Conversation };

export function useChatListViewModel() {
  const router = useRouter();
  const { conversations, loadingConversations, fetchConversations } = useChat();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const navigateToChat = (matchId: string) => {
    router.push(`/(tabs)/chat/${matchId}`);
  };

  return {
    conversations,
    loadingConversations,
    fetchConversations,
    navigateToChat,
  };
}
