import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

interface SwipeCardProps {
  dog: {
    name: string;
    breed: string;
    age: string;
    distance: string;
    imageUrl: string | null;
  };
}

export function SwipeCard({ dog }: SwipeCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(modals)/dog-detail')}
      className="w-full overflow-hidden rounded-3xl bg-white shadow-lg"
      style={{ aspectRatio: 3 / 4 }}
    >
      {/* Immagine placeholder */}
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-8xl">🐕</Text>
      </View>

      {/* Info overlay */}
      <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold text-white">{dog.name}</Text>
            <Text className="text-base text-white/80">{dog.breed}</Text>
            <Text className="text-sm text-white/60">{dog.age}</Text>
          </View>
          <View className="rounded-full bg-white/20 px-3 py-1">
            <Text className="text-sm font-medium text-white">{dog.distance}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
