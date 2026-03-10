import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { api } from '@/lib/api';
import type { MatchResult } from '@/hooks/useMatching';

type MatchFilter = 'tutti' | 'nuovo' | 'in_chat' | 'incontrato';

const FILTERS: { value: MatchFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'nuovo', label: 'Nuovi' },
  { value: 'in_chat', label: 'In chat' },
  { value: 'incontrato', label: 'Incontrati' },
];

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<MatchFilter>('tutti');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<MatchResult[]>('/matches');
      setMatches(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const filteredMatches = filter === 'tutti' ? matches : matches.filter((m) => m.status === filter);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">I tuoi Match</Text>
      </View>

      {/* Filter chips */}
      <View className="flex-row gap-2 px-4 py-3">
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1.5 ${
              filter === f.value ? 'bg-primary' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                filter === f.value ? 'text-white' : 'text-gray-600'
              }`}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-2"
        onRefresh={fetchMatches}
        refreshing={loading}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/chat/${item.id}`)}>
            <MatchCard
              dogName={item.dogName}
              ownerName={item.ownerName}
              breed={item.breed}
              matchedAt={item.matchedAt}
              compatibilityScore={item.compatibilityScore}
              status={item.status}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg text-gray-400">
              {filter === 'tutti' ? 'Nessun match ancora' : 'Nessun match in questa categoria'}
            </Text>
            {filter === 'tutti' && <Text className="text-sm text-gray-300">Inizia a swipare!</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
