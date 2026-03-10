import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation } from '@/hooks/useChat';
import { useChat } from '@/hooks/useChat';

function ChatRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-gray-50 px-4 py-3"
    >
      {/* Avatar with online indicator */}
      <View className="relative">
        <Avatar name={conversation.dogName} size="md" />
        {conversation.isOnline && (
          <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
        )}
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
            {conversation.dogName} & {conversation.ownerName}
          </Text>
          <Text className="text-xs text-gray-400">{conversation.lastMessageAt ?? ''}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-sm ${
              conversation.unreadCount > 0 ? 'font-medium text-gray-700' : 'text-gray-500'
            }`}
            numberOfLines={1}
          >
            {conversation.lastMessage ?? 'Nessun messaggio'}
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

export default function ChatListScreen() {
  const router = useRouter();
  const { conversations, loadingConversations, fetchConversations } = useChat();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">Chat</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.matchId}
        onRefresh={fetchConversations}
        refreshing={loadingConversations}
        renderItem={({ item }) => (
          <ChatRow
            conversation={item}
            onPress={() => router.push(`/(tabs)/chat/${item.matchId}`)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">💬</Text>
            <Text className="mt-4 text-lg text-gray-400">Nessuna chat</Text>
            <Text className="text-sm text-gray-300">
              Fai match con qualcuno per iniziare a chattare!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
