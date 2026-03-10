export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { api } from '@/lib/trpc';

type EnrichedMatch = RouterOutput['matches']['list']['matches'][number];

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">I tuoi Match</Text>
      </View>

      <FlatList
        data={matches}
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
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg text-gray-400">Nessun match ancora</Text>
            <Text className="text-sm text-gray-300">Inizia a swipare!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
