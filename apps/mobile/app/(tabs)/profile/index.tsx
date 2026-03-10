export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { MAX_DOGS_PER_USER } from '@dogwalk/config';
import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ProfileLoadingSkeleton() {
  return (
    <View className="px-4 py-6">
      {/* Avatar skeleton */}
      <View className="mb-8 items-center">
        <View className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
        <View className="mt-3 h-5 w-32 rounded bg-gray-200 animate-pulse" />
        <View className="mt-2 h-4 w-40 rounded bg-gray-200 animate-pulse" />
      </View>

      {/* Dogs section skeleton */}
      <View className="mb-6">
        <View className="mb-3 h-5 w-24 rounded bg-gray-200 animate-pulse" />
        <View className="flex-row items-center rounded-2xl bg-white p-4 shadow-sm">
          <View className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
          <View className="ml-3 flex-1">
            <View className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            <View className="mt-2 h-3 w-36 rounded bg-gray-200 animate-pulse" />
          </View>
        </View>
      </View>

      {/* Menu skeleton */}
      <View className="gap-1">
        <View className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        <View className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        <View className="h-12 rounded-xl bg-gray-100 animate-pulse" />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const dogs = useDogsStore((s) => s.dogs);
  const setDogs = useDogsStore((s) => s.setDogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const setSelectedDog = useDogsStore((s) => s.setSelectedDog);
  const { uploading, uploadAvatar } = useImageUpload();
  const [loadingDogs, setLoadingDogs] = useState(true);

  useEffect(() => {
    api.dogs.list
      .query()
      .then(({ dogs: data }) => setDogs(data))
      .catch((e) => logger.warn('ProfileScreen', 'Failed to fetch dogs', e))
      .finally(() => setLoadingDogs(false));
  }, [setDogs]);

  const handleAvatarPress = async () => {
    await uploadAvatar();
  };

  // Show skeleton while initial data is loading
  if (!user || loadingDogs) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ProfileLoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-4 py-6">
        {/* User profile */}
        <View className="mb-8 items-center">
          <Pressable onPress={handleAvatarPress} disabled={uploading} className="relative">
            <Avatar name={user.displayName ?? 'Utente'} imageUrl={user.avatarUrl} size="lg" />
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
            {user.displayName ?? 'Utente'}
          </Text>
          <Text className="text-sm text-gray-500">{user.email}</Text>
          <Text className="mt-1 text-xs text-gray-400">Tocca la foto per cambiarla</Text>
        </View>

        {/* My dogs */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">I miei cani</Text>
            {dogs.length < MAX_DOGS_PER_USER && (
              <Pressable onPress={() => router.push('/(tabs)/profile/dogs/new')}>
                <Text className="text-sm font-medium text-primary">+ Aggiungi</Text>
              </Pressable>
            )}
          </View>

          {dogs.length === 0 ? (
            <View className="items-center rounded-2xl bg-gray-50 p-6">
              <Text className="text-4xl">{'\u{1F436}'}</Text>
              <Text className="mt-2 text-sm text-gray-500 text-center">
                Non hai ancora aggiunto nessun cane.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/profile/dogs/new')}
                className="mt-4 rounded-2xl bg-primary px-6 py-2.5"
              >
                <Text className="font-semibold text-white">Aggiungi il tuo cane</Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {dogs.map((dog) => {
                const isActive = dog.id === selectedDogId;
                return (
                  <View key={dog.id} className="relative">
                    <DogProfileCard
                      name={dog.name}
                      breed={dog.breed}
                      age={calculateAge(dog.birthDate)}
                      onPress={() => router.push(`/(tabs)/profile/dogs/${dog.id}`)}
                    />
                    {/* Active dog indicator (multi-dog only) */}
                    {dogs.length > 1 && (
                      <Pressable
                        onPress={() => setSelectedDog(dog.id)}
                        className={`absolute right-10 top-4 rounded-full px-2 py-0.5 ${
                          isActive ? 'bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-semibold ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {isActive ? 'Attivo' : 'Attiva'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
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
