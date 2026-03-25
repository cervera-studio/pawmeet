import type { RouterOutput } from '@pawmeet/api-client';
import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useGroupChat } from '@/hooks/useGroupChat';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type Conversation = RouterOutput['chat']['listConversations']['conversations'][number];
type GroupConversation = RouterOutput['groupChat']['listConversations']['conversations'][number];
type EnrichedMatch = RouterOutput['matches']['list']['matches'][number];

export type { Conversation, EnrichedMatch, GroupConversation };

const TABS = {
  MESSAGES: 'messages',
  GROUPS: 'groups',
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

export type { Tab };
export { TABS };

export function useChatListViewModel() {
  const router = useRouter();
  const dogs = useDogsStore((s) => s.dogs);
  const { conversations, loadingConversations, fetchConversations } = useChat();
  const {
    conversations: groupConversations,
    loadingConversations: loadingGroupConversations,
    fetchConversations: fetchGroupConversations,
  } = useGroupChat();
  const [activeTab, setActiveTab] = useState<Tab>(TABS.MESSAGES);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const { matches: data } = await api.matches.list.query();
      setMatches(data);
    } catch (e) {
      logger.warn('ChatListScreen', 'Failed to fetch matches', e);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  // Match without a conversation yet (no messages exchanged)
  const conversationMatchIds = useMemo(
    () => new Set(conversations.map((c) => c.matchId)),
    [conversations],
  );
  const newMatches = useMemo(
    () => matches.filter((m) => !conversationMatchIds.has(m.id)),
    [matches, conversationMatchIds],
  );

  const dogNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const dog of dogs) {
      map.set(dog.id, dog.name);
    }
    return map;
  }, [dogs]);

  useEffect(() => {
    void fetchConversations();
    void fetchGroupConversations();
    void fetchMatches();
  }, [fetchConversations, fetchGroupConversations, fetchMatches]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchConversations(), fetchGroupConversations(), fetchMatches()]);
  }, [fetchConversations, fetchGroupConversations, fetchMatches]);

  const navigateToChat = (matchId: string) => {
    router.push(`/(tabs)/chat/${matchId}`);
  };

  const navigateToGroupChat = (eventId: string) => {
    router.push(`/(tabs)/chat/group/${eventId}`);
  };

  const navigateToDiscover = useCallback(() => {
    router.push('/(tabs)/discover');
  }, [router]);

  return {
    activeTab,
    setActiveTab,
    conversations,
    groupConversations,
    loadingConversations,
    loadingGroupConversations,
    loadingMatches,
    newMatches,
    dogNameById,
    fetchConversations,
    fetchGroupConversations,
    refreshAll,
    navigateToChat,
    navigateToGroupChat,
    navigateToDiscover,
  };
}
