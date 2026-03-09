import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export default function DogDetailModal() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-4">
      {/* Header immagine placeholder */}
      <View className="mb-4 h-72 items-center justify-center rounded-2xl bg-gray-100">
        <Text className="text-6xl">🐕</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Luna</Text>
          <Text className="text-base text-gray-500">Golden Retriever - 3 anni</Text>
        </View>
        <View className="rounded-full bg-secondary-50 px-3 py-1">
          <Text className="text-sm font-medium text-secondary">1.2 km</Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-gray-50 p-4">
        <Text className="text-base text-gray-700">
          Luna ama giocare al parco e fare lunghe passeggiate. Va d'accordo con tutti i cani,
          specialmente quelli della sua taglia.
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
          <Text className="text-xs text-gray-500">Taglia</Text>
          <Text className="font-semibold text-gray-900">Grande</Text>
        </View>
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
          <Text className="text-xs text-gray-500">Energia</Text>
          <Text className="font-semibold text-gray-900">Alta</Text>
        </View>
        <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
          <Text className="text-xs text-gray-500">Carattere</Text>
          <Text className="font-semibold text-gray-900">Socievole</Text>
        </View>
      </View>

      {/* Owner info */}
      <View className="mt-4 flex-row items-center rounded-2xl bg-gray-50 p-4">
        <Avatar name="Marco" size="sm" />
        <View className="ml-3">
          <Text className="text-base font-semibold text-gray-900">Marco</Text>
          <Text className="text-sm text-gray-500">Proprietario</Text>
        </View>
      </View>

      <View className="mt-6 gap-3 pb-8">
        <Button onPress={() => router.back()} label="Mi piace!" />
        <Pressable onPress={() => router.push('/(modals)/report')} className="items-center py-2">
          <Text className="text-sm text-gray-400">Segnala profilo</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
