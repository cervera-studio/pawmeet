import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeCard } from '@/components/SwipeCard';

export default function DiscoveryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-2">
        <Text className="text-2xl font-bold text-gray-900">Scopri</Text>
        <Text className="text-sm text-gray-500">Cani nelle vicinanze</Text>
      </View>

      <View className="flex-1 items-center justify-center px-4">
        <SwipeCard
          dog={{
            name: 'Luna',
            breed: 'Golden Retriever',
            age: '3 anni',
            distance: '1.2 km',
            imageUrl: null,
          }}
        />
      </View>

      <View className="flex-row justify-center gap-6 pb-4">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
          <Text className="text-2xl">✕</Text>
        </View>
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md">
          <Text className="text-2xl">🐾</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
