import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';

const PLACEHOLDER_CHATS = [
  {
    id: '1',
    dogName: 'Luna',
    ownerName: 'Marco',
    lastMessage: 'Ci vediamo al parco alle 17?',
    timestamp: '14:30',
    unread: 2,
  },
  {
    id: '2',
    dogName: 'Rex',
    ownerName: 'Giulia',
    lastMessage: 'Perfetto, a domani!',
    timestamp: 'Ieri',
    unread: 0,
  },
];

export default function ChatListScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">Chat</Text>
      </View>

      <FlatList
        data={PLACEHOLDER_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
            className="flex-row items-center border-b border-gray-50 px-4 py-3"
          >
            <Avatar name={item.dogName} size="md" />
            <View className="ml-3 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900">
                  {item.dogName} & {item.ownerName}
                </Text>
                <Text className="text-xs text-gray-400">{item.timestamp}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Text className="text-xs font-bold text-white">{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">💬</Text>
            <Text className="mt-4 text-lg text-gray-400">Nessuna chat</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
