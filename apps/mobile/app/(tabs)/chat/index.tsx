export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation, GroupConversation, Tab } from './index.view-model';
import { TABS, useChatListViewModel } from './index.view-model';

// ── Segment control ──────────────────────────────────────────────────────────

function SegmentControl({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <View className="mx-4 mb-2 flex-row rounded-xl bg-gray-100 p-1">
      <Pressable
        onPress={() => onTabChange(TABS.MESSAGES)}
        className={`flex-1 items-center rounded-lg py-2 ${
          activeTab === TABS.MESSAGES ? 'bg-white shadow-sm' : ''
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === TABS.MESSAGES ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          Messaggi
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onTabChange(TABS.GROUPS)}
        className={`flex-1 items-center rounded-lg py-2 ${
          activeTab === TABS.GROUPS ? 'bg-white shadow-sm' : ''
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            activeTab === TABS.GROUPS ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          Gruppi
        </Text>
      </Pressable>
    </View>
  );
}

// ── 1-on-1 chat row ─────────────────────────────────────────────────────────

function ChatRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-gray-50 px-4 py-3"
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
                ? 'font-bold text-gray-900'
                : 'font-semibold text-gray-900'
            }`}
          >
            {conversation.otherDogName ?? 'Cane'} &{' '}
            {conversation.otherUser?.displayName ?? 'Utente'}
          </Text>
          <Text className="text-xs text-gray-400">
            {conversation.lastMessage ? String(conversation.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm ${
              conversation.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-500'
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
      className="flex-row items-center border-b border-gray-50 px-4 py-3"
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
                ? 'font-bold text-gray-900'
                : 'font-semibold text-gray-900'
            }`}
            numberOfLines={1}
          >
            {conversation.eventTitle}
          </Text>
          <Text className="text-xs text-gray-400">
            {conversation.lastMessage ? String(conversation.lastMessage.createdAt) : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <Text
              className={`text-sm ${
                conversation.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-500'
              }`}
              numberOfLines={1}
            >
              {conversation.lastMessage?.content ?? 'Nessun messaggio'}
            </Text>
          </View>
          <View className="flex-row items-center ml-2">
            <Text className="text-xs text-gray-400 mr-1">
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

// ── Empty states ─────────────────────────────────────────────────────────────

function MessagesEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F4AC}'}</Text>
      <Text className="mt-4 text-lg text-gray-400">Nessuna chat</Text>
      <Text className="text-sm text-gray-300">
        Fai match con qualcuno per iniziare a chattare!
      </Text>
    </View>
  );
}

function GroupsEmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F465}'}</Text>
      <Text className="mt-4 text-lg text-gray-400">Nessuna chat di gruppo</Text>
      <Text className="text-sm text-gray-300">
        Partecipa a un evento per chattare con il gruppo!
      </Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const vm = useChatListViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">Chat</Text>
      </View>

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
