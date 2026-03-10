import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogProfileCard } from '@/components/DogProfileCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

function calculateAge(birthDate: Date | string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  if (years < 1) {
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} mesi`;
  }
  return `${years} ${years === 1 ? 'anno' : 'anni'}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const dogs = useDogsStore((s) => s.dogs);
  const setDogs = useDogsStore((s) => s.setDogs);
  const { uploading, uploadAvatar } = useImageUpload();

  useEffect(() => {
    api.dogs.list
      .query()
      .then(({ dogs: data }) => setDogs(data))
      .catch((e) => logger.warn('ProfileScreen', 'Failed to fetch dogs', e));
  }, [setDogs]);

  const handleAvatarPress = async () => {
    await uploadAvatar();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-4 py-6">
        {/* User profile */}
        <View className="mb-8 items-center">
          <Pressable onPress={handleAvatarPress} disabled={uploading} className="relative">
            <Avatar name={user?.displayName ?? 'Utente'} imageUrl={user?.avatarUrl} size="lg" />
            {/* Camera icon overlay */}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-primary">
              {uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm text-white">{'\u{1F4F7}'}</Text>
              )}
            </View>
          </Pressable>
          <Text className="mt-3 text-xl font-bold text-gray-900">
            {user?.displayName ?? 'Utente'}
          </Text>
          <Text className="text-sm text-gray-500">{user?.email}</Text>
          <Text className="mt-1 text-xs text-gray-400">Tocca la foto per cambiarla</Text>
        </View>

        {/* My dogs */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">I miei cani</Text>
            <Pressable onPress={() => router.push('/(tabs)/profile/dogs/new')}>
              <Text className="text-sm font-medium text-primary">+ Aggiungi</Text>
            </Pressable>
          </View>

          {dogs.length === 0 ? (
            <View className="items-center rounded-2xl bg-gray-50 p-6">
              <Text className="text-sm text-gray-400">Non hai ancora aggiunto nessun cane</Text>
            </View>
          ) : (
            <View className="gap-3">
              {dogs.map((dog) => (
                <DogProfileCard
                  key={dog.id}
                  name={dog.name}
                  breed={dog.breed}
                  age={calculateAge(dog.birthDate)}
                  onPress={() => router.push(`/(tabs)/profile/dogs/${dog.id}`)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Menu */}
        <View className="gap-1">
          <Pressable
            onPress={() => router.push('/(modals)/settings')}
            className="flex-row items-center justify-between rounded-xl px-4 py-4"
          >
            <Text className="text-base text-gray-700">Impostazioni</Text>
            <Text className="text-gray-400">{'\u203A'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700">Privacy e Sicurezza</Text>
            <Text className="text-gray-400">{'\u203A'}</Text>
          </Pressable>

          <Pressable className="flex-row items-center justify-between rounded-xl px-4 py-4">
            <Text className="text-base text-gray-700">Aiuto e Supporto</Text>
            <Text className="text-gray-400">{'\u203A'}</Text>
          </Pressable>

          <Pressable onPress={logout} className="mt-4 items-center rounded-xl py-4">
            <Text className="text-base font-medium text-red-500">Esci</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
