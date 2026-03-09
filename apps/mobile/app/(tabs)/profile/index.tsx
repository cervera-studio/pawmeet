import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-4 py-6">
        {/* Profilo utente */}
        <View className="mb-8 items-center">
          <Avatar name="Utente" size="lg" />
          <Text className="mt-3 text-xl font-bold text-gray-900">Nome Utente</Text>
          <Text className="text-sm text-gray-500">Roma, Italia</Text>
        </View>

        {/* I miei cani */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">I miei cani</Text>
            <Pressable onPress={() => router.push('/(tabs)/profile/dogs/new')}>
              <Text className="text-sm font-medium text-primary">+ Aggiungi</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/profile/dogs/1')}
            className="flex-row items-center rounded-2xl bg-gray-50 p-4"
          >
            <Avatar name="Luna" size="md" />
            <View className="ml-3">
              <Text className="text-base font-semibold text-gray-900">Luna</Text>
              <Text className="text-sm text-gray-500">Golden Retriever - 3 anni</Text>
            </View>
          </Pressable>
        </View>

        {/* Menu */}
        <View className="gap-1">
          <Pressable
            onPress={() => router.push('/(modals)/settings')}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700">Impostazioni</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700">Privacy e Sicurezza</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700">Aiuto e Supporto</Text>
            <Text className="text-gray-400">›</Text>
          </Pressable>

          <Pressable
            onPress={logout}
            className="mt-4 items-center rounded-xl py-4"
          >
            <Text className="text-base font-medium text-red-500">Esci</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
