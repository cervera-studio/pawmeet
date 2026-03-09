import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export default function DogDetailScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Luna',
          headerBackTitle: 'Profilo',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <ScrollView contentContainerClassName="px-6 py-4">
          <View className="items-center">
            <Avatar name="Luna" size="lg" />
            <Text className="mt-3 text-2xl font-bold text-gray-900">Luna</Text>
            <Text className="text-base text-gray-500">Golden Retriever</Text>
            <Text className="text-sm text-gray-400">3 anni</Text>
          </View>

          <View className="mt-6 gap-4">
            <View className="rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Bio</Text>
              <Text className="text-base text-gray-700">
                Luna ama giocare al parco e fare lunghe passeggiate. Va d'accordo con tutti i cani!
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
                <Text className="text-xs text-gray-500">Taglia</Text>
                <Text className="text-base font-semibold text-gray-900">Grande</Text>
              </View>
              <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
                <Text className="text-xs text-gray-500">Energia</Text>
                <Text className="text-base font-semibold text-gray-900">Alta</Text>
              </View>
              <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
                <Text className="text-xs text-gray-500">Carattere</Text>
                <Text className="text-base font-semibold text-gray-900">Socievole</Text>
              </View>
            </View>

            {/* Foto placeholder */}
            <View>
              <Text className="mb-2 text-base font-semibold text-gray-900">Foto</Text>
              <View className="flex-row gap-2">
                <View className="h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
                  <Text className="text-2xl">🐕</Text>
                </View>
                <View className="h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
                  <Text className="text-2xl">📷</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="mt-8">
            <Button onPress={() => {/* TODO: modifica */}} label="Modifica profilo" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
