import type { RouterOutput } from '@pawmeet/api-client';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useGroupChat } from '@/hooks/useGroupChat';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];
type GroupConversation = RouterOutput['groupChat']['listConversations']['conversations'][number];

export type { Conversation, GroupConversation };

const TABS = {
  MESSAGES: 'messages',
  GROUPS: 'groups',
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

export { TABS };
export type { Tab };

export function useChatListViewModel() {
  const router = useRouter();
  const { conversations, loadingConversations, fetchConversations } = useChat();
  const {
    conversations: groupConversations,
    loadingConversations: loadingGroupConversations,
    fetchConversations: fetchGroupConversations,
  } = useGroupChat();
  const [activeTab, setActiveTab] = useState<Tab>(TABS.MESSAGES);

  useEffect(() => {
    void fetchConversations();
    void fetchGroupConversations();
  }, [fetchConversations, fetchGroupConversations]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchConversations(), fetchGroupConversations()]);
  }, [fetchConversations, fetchGroupConversations]);

  const navigateToChat = (matchId: string) => {
    router.push(`/(tabs)/chat/${matchId}`);
  };

  const navigateToGroupChat = (eventId: string) => {
    router.push(`/(tabs)/chat/group/${eventId}`);
  };

  return {
    activeTab,
    setActiveTab,
    conversations,
    groupConversations,
    loadingConversations,
    loadingGroupConversations,
    fetchConversations,
    fetchGroupConversations,
    refreshAll,
    navigateToChat,
    navigateToGroupChat,
  };
}
