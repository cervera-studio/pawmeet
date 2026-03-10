export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCelebration } from '@/components/MatchCelebration';
import { SwipeCard } from '@/components/SwipeCard';
import { useLocation } from '@/hooks/useLocation';
import { useMatching } from '@/hooks/useMatching';

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

export default function DiscoveryScreen() {
  const router = useRouter();
  const { coordinates, getCurrentLocation } = useLocation();
  const {
    currentProfile,
    isLoading,
    hasMore,
    newMatch,
    fetchSuggestions,
    swipeRight,
    swipeLeft,
    superLike,
    dismissMatch,
  } = useMatching();

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (coordinates) {
      fetchSuggestions();
    }
  }, [coordinates, fetchSuggestions]);

  const handleSwipeRight = () => {
    if (currentProfile) swipeRight(currentProfile.dog.id);
  };

  const handleSwipeLeft = () => {
    if (currentProfile) swipeLeft(currentProfile.dog.id);
  };

  const handleSuperLike = () => {
    if (currentProfile) superLike(currentProfile.dog.id);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Scopri</Text>
          <Text className="text-sm text-gray-500">Cani nelle vicinanze</Text>
        </View>
      </View>

      {/* Card area */}
      <View className="flex-1 items-center justify-center px-4">
        {!coordinates ? (
          <View className="items-center px-8">
            <Text className="text-5xl">📍</Text>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
              Posizione necessaria
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Abilita la posizione per scoprire cani nelle vicinanze.
            </Text>
            <Pressable
              onPress={getCurrentLocation}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">Abilita posizione</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text className="mt-4 text-gray-400">Cerco cani compatibili...</Text>
          </View>
        ) : currentProfile && hasMore ? (
          <SwipeCard
            dog={{
              dogId: currentProfile.dog.id,
              name: currentProfile.dog.name,
              breed: currentProfile.dog.breed,
              age: calculateAge(currentProfile.dog.birthDate),
              distanceKm: currentProfile.distanceKm,
              compatibilityScore: currentProfile.compatibilityScore,
              ownerName: currentProfile.dog.ownerId,
              imageUrl: null,
            }}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSuperLike}
          />
        ) : (
          <View className="items-center">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg font-semibold text-gray-900">Nessun altro profilo</Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Hai visto tutti i cani nelle vicinanze. Riprova più tardi!
            </Text>
            <Pressable onPress={fetchSuggestions} className="mt-6 rounded-2xl bg-primary px-8 py-3">
              <Text className="font-semibold text-white">Aggiorna</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {currentProfile && hasMore && (
        <View className="flex-row items-center justify-center gap-6 pb-4">
          <Pressable
            onPress={handleSwipeLeft}
            className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-md"
          >
            <Text className="text-2xl">✕</Text>
          </Pressable>
          <Pressable
            onPress={handleSuperLike}
            className="h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-md"
          >
            <Text className="text-xl text-white">★</Text>
          </Pressable>
          <Pressable
            onPress={handleSwipeRight}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md"
          >
            <Text className="text-2xl">🐾</Text>
          </Pressable>
        </View>
      )}

      {/* Match celebration overlay */}
      {newMatch?.isMatch && (
        <MatchCelebration
          onDismiss={dismissMatch}
          onChat={() => {
            dismissMatch();
            if (newMatch.match) {
              router.push(`/(tabs)/chat/${newMatch.match.id}`);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
