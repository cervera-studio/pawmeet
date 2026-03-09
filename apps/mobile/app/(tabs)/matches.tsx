import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MatchCard } from '@/components/MatchCard';

const PLACEHOLDER_MATCHES = [
  { id: '1', dogName: 'Luna', ownerName: 'Marco', breed: 'Golden Retriever', matchedAt: 'Oggi' },
  { id: '2', dogName: 'Rex', ownerName: 'Giulia', breed: 'Pastore Tedesco', matchedAt: 'Ieri' },
  { id: '3', dogName: 'Milo', ownerName: 'Anna', breed: 'Labrador', matchedAt: '2 giorni fa' },
];

export default function MatchesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">I tuoi Match</Text>
      </View>

      <FlatList
        data={PLACEHOLDER_MATCHES}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-2"
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/chat/${item.id}`)}>
            <MatchCard
              dogName={item.dogName}
              ownerName={item.ownerName}
              breed={item.breed}
              matchedAt={item.matchedAt}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg text-gray-400">Nessun match ancora</Text>
            <Text className="text-sm text-gray-300">Inizia a swipare!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
