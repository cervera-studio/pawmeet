export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentControl } from '@/components/chat/SegmentControl';
import { RequireDogModal } from '@/components/RequireDogModal';
import { Avatar } from '@/components/ui/Avatar';
import { useRequireDog } from '@/hooks/useRequireDog';
import type { Conversation, EnrichedMatch, GroupConversation, Tab } from './_vm/index.view-model';
import { TABS, useChatListViewModel } from './_vm/index.view-model';

// ── 1-on-1 chat row ─────────────────────────────────────────────────────────

function ChatRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-gray-50 dark:border-[#38383A] px-4 py-3"
    >
      {/* Avatar */}
      <View className="relative">
        <Avatar name={conversation.otherDogName ?? 'Cane'} size="md" />
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${
              conversation.unreadCount > 0
                ? 'font-bold text-gray-900 dark:text-[#F5F5F7]'
                : 'font-semibold text-gray-900 dark:text-[#F5F5F7]'
            }`}
          >
            {conversation.otherDogName ?? 'Cane'} &{' '}
            {conversation.otherUser?.displayName ?? 'Utente'}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-neutral-500">
            {conversation.lastMessage ? String(conversation.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm ${
              conversation.unreadCount > 0
                ? 'font-medium text-gray-700 dark:text-[#D1D1D6]'
                : 'text-gray-500 dark:text-neutral-500'
            }`}
            numberOfLines={1}
          >
            {conversation.lastMessage?.content ?? 'Nessun messaggio'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
              <Text className="text-xs font-bold text-white">{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Group chat row ───────────────────────────────────────────────────────────

function GroupChatRow({
  conversation,
  onPress,
}: {
  conversation: GroupConversation;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-gray-50 dark:border-[#38383A] px-4 py-3"
    >
      {/* Group avatar */}
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Text className="text-lg">{'\u{1F465}'}</Text>
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${
              conversation.unreadCount > 0
                ? 'font-bold text-gray-900 dark:text-[#F5F5F7]'
                : 'font-semibold text-gray-900 dark:text-[#F5F5F7]'
            }`}
            numberOfLines={1}
          >
            {conversation.eventTitle}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-neutral-500">
            {conversation.lastMessage ? String(conversation.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <Text
              className={`text-sm ${
                conversation.unreadCount > 0
                  ? 'font-medium text-gray-700 dark:text-[#D1D1D6]'
                  : 'text-gray-500 dark:text-neutral-500'
              }`}
              numberOfLines={1}
            >
              {conversation.lastMessage?.content ?? 'Nessun messaggio'}
            </Text>
          </View>
          <View className="flex-row items-center ml-2">
            <Text className="text-xs text-gray-400 dark:text-neutral-500 mr-1">
              {conversation.participantCount}
            </Text>
            {conversation.unreadCount > 0 && (
              <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
                <Text className="text-xs font-bold text-white">{conversation.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Matches rail (horizontal, like Instagram DM stories) ────────────────────

function MatchesRail({
  matches,
  onPress,
}: {
  matches: EnrichedMatch[];
  onPress: (matchId: string) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <View className="border-b border-gray-100 dark:border-[#38383A] py-3">
      <Text className="mb-2 px-4 text-xs font-semibold uppercase text-gray-400 dark:text-neutral-500">
        Nuovi match
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-4"
      >
        {matches.map((match) => (
          <Pressable key={match.id} onPress={() => onPress(match.id)} className="items-center">
            <View className="rounded-full border-2 border-primary p-0.5">
              <Avatar name={match.otherDog.name} size="md" />
            </View>
            <Text
              className="mt-1 text-xs font-medium text-gray-700 dark:text-[#D1D1D6]"
              numberOfLines={1}
              style={{ maxWidth: 64 }}
            >
              {match.otherDog.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Empty states ─────────────────────────────────────────────────────────────

function MessagesEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F4AC}'}</Text>
      <Text className="mt-4 text-lg text-gray-400 dark:text-neutral-500">Nessuna chat</Text>
      <Text className="text-sm text-gray-300">Fai match con qualcuno per iniziare a chattare!</Text>
    </View>
  );
}

function GroupsEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F465}'}</Text>
      <Text className="mt-4 text-lg text-gray-400 dark:text-neutral-500">
        Nessuna chat di gruppo
      </Text>
      <Text className="text-sm text-gray-300">
        Partecipa a un evento per chattare con il gruppo!
      </Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const vm = useChatListViewModel();
  const { hasDog, showGate, setShowGate, dismissGate, goToAddDog } = useRequireDog();

  useEffect(() => {
    if (!hasDog) setShowGate(true);
  }, [hasDog, setShowGate]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <RequireDogModal visible={showGate} onDismiss={dismissGate} onAddDog={goToAddDog} />
      <View className="border-b border-gray-100 dark:border-[#38383A] px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">Chat</Text>
      </View>

      <MatchesRail matches={vm.newMatches} onPress={vm.navigateToChat} />

      <SegmentControl activeTab={vm.activeTab} onTabChange={vm.setActiveTab} />

      {vm.activeTab === TABS.MESSAGES ? (
        <FlatList
          data={vm.conversations}
          keyExtractor={(item) => item.matchId}
          onRefresh={vm.refreshAll}
          refreshing={vm.loadingConversations}
          renderItem={({ item }) => (
            <ChatRow conversation={item} onPress={() => vm.navigateToChat(item.matchId)} />
          )}
          ListEmptyComponent={<MessagesEmptyState />}
        />
      ) : (
        <FlatList
          data={vm.groupConversations}
          keyExtractor={(item) => item.eventId}
          onRefresh={vm.refreshAll}
          refreshing={vm.loadingGroupConversations}
          renderItem={({ item }) => (
            <GroupChatRow
              conversation={item}
              onPress={() => vm.navigateToGroupChat(item.eventId)}
            />
          )}
          ListEmptyComponent={<GroupsEmptyState />}
        />
      )}
    </SafeAreaView>
  );
}
