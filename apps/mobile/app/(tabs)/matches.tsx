export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

type EnrichedMatch = RouterOutput['matches']['list']['matches'][number];

export default function MatchesScreen() {
  const router = useRouter();
  const dogs = useDogsStore((s) => s.dogs);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  // null = show all dogs' matches
  const [filterDogId, setFilterDogId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const { matches: data } = await api.matches.list.query();
      setMatches(data);
    } catch (e) {
      logger.warn('MatchesScreen', 'Failed to fetch matches', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Helper to find dog name by id
  const dogNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const dog of dogs) {
      map.set(dog.id, dog.name);
    }
    return map;
  }, [dogs]);

  // Filter matches by selected dog (if multi-dog)
  const filteredMatches = useMemo(() => {
    if (!filterDogId) return matches;
    return matches.filter((m) => m.dogId === filterDogId);
  }, [matches, filterDogId]);

  const hasMultipleDogs = dogs.length > 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">I tuoi Match</Text>
      </View>

      {/* Dog filter chips (only for multi-dog users) */}
      {hasMultipleDogs && (
        <View className="border-b border-gray-100 px-4 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setFilterDogId(null)}
                className={`rounded-full px-4 py-2 ${!filterDogId ? 'bg-primary' : 'bg-gray-100'}`}
              >
                <Text
                  className={`text-sm font-medium ${!filterDogId ? 'text-white' : 'text-gray-700'}`}
                >
                  Tutti
                </Text>
              </Pressable>
              {dogs.map((dog) => (
                <Pressable
                  key={dog.id}
                  onPress={() => setFilterDogId(dog.id === filterDogId ? null : dog.id)}
                  className={`rounded-full px-4 py-2 ${
                    filterDogId === dog.id ? 'bg-primary' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      filterDogId === dog.id ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {dog.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-2"
        onRefresh={fetchMatches}
        refreshing={loading}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/chat/${item.id}`)}>
            <MatchCard
              dogName={item.otherDog.name}
              ownerName={item.otherOwner.displayName}
              breed={item.otherDog.breed}
              matchedAt={String(item.createdAt)}
              compatibilityScore={item.compatibilityScore}
              myDogName={hasMultipleDogs ? dogNameById.get(item.dogId) : undefined}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">{'\u{1F415}'}</Text>
            <Text className="mt-4 text-lg text-gray-400">Nessun match ancora</Text>
            <Text className="text-sm text-gray-300">Inizia a swipare!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
