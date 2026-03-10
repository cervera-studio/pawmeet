import type { DogProfile } from '@dogwalk/types';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogProfileCard } from '@/components/DogProfileCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
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

  useEffect(() => {
    api
      .get<DogProfile[]>('/dogs/mine')
      .then(setDogs)
      .catch(() => {});
  }, [setDogs]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-4 py-6">
        {/* User profile */}
        <View className="mb-8 items-center">
          <Avatar name={user?.displayName ?? 'Utente'} size="lg" />
          <Text className="mt-3 text-xl font-bold text-gray-900">
            {user?.displayName ?? 'Utente'}
          </Text>
          <Text className="text-sm text-gray-500">{user?.email}</Text>
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

          <Pressable onPress={logout} className="mt-4 items-center rounded-xl py-4">
            <Text className="text-base font-medium text-red-500">Esci</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
