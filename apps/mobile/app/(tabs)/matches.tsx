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

// ── Loading skeleton ──────────────────────────────────────────────────────────

function MatchCardSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-white p-4 shadow-sm">
      <View className="h-12 w-12 rounded-full bg-gray-200 animate-pulse" />
      <View className="ml-3 flex-1">
        <View className="h-4 w-36 rounded bg-gray-200 animate-pulse" />
        <View className="mt-2 h-3 w-24 rounded bg-gray-200 animate-pulse" />
        <View className="mt-1 h-3 w-20 rounded bg-gray-200 animate-pulse" />
      </View>
      <View className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
    </View>
  );
}

function MatchesLoadingSkeleton() {
  return (
    <View className="px-4 py-2">
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function MatchesEmptyState() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F415}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900">Nessun match ancora</Text>
      <Text className="mt-2 text-center text-sm text-gray-500 px-8">
        Continua a esplorare profili per trovare compagni di passeggiata!
      </Text>
      <Pressable
        onPress={() => router.push('/(tabs)/')}
        className="mt-6 rounded-2xl bg-primary px-8 py-3"
      >
        <Text className="font-semibold text-white">Scopri cani</Text>
      </Pressable>
    </View>
  );
}

// ── Estimated item height for getItemLayout (card height ~80px) ──────────────

const MATCH_CARD_HEIGHT = 84;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const router = useRouter();
  const dogs = useDogsStore((s) => s.dogs);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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
      setHasLoaded(true);
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

  const renderItem = useCallback(
    ({ item }: { item: EnrichedMatch }) => (
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
    ),
    [router, hasMultipleDogs, dogNameById],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<EnrichedMatch> | null | undefined, index: number) => ({
      length: MATCH_CARD_HEIGHT,
      offset: MATCH_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  // Show skeleton only on initial load
  const isInitialLoad = loading && !hasLoaded;

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

      {isInitialLoad ? (
        <MatchesLoadingSkeleton />
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-2"
          onRefresh={fetchMatches}
          refreshing={loading}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          ListEmptyComponent={<MatchesEmptyState />}
        />
      )}
    </SafeAreaView>
  );
}
