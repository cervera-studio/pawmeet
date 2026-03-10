export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import type { EnrichedMatch } from './matches.view-model';
import { useMatchesViewModel } from './matches.view-model';

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

function MatchesEmptyState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-5xl">{'\u{1F415}'}</Text>
      <Text className="mt-4 text-lg font-semibold text-gray-900">Nessun match ancora</Text>
      <Text className="mt-2 text-center text-sm text-gray-500 px-8">
        Continua a esplorare profili per trovare compagni di passeggiata!
      </Text>
      <Pressable onPress={onDiscover} className="mt-6 rounded-2xl bg-primary px-8 py-3">
        <Text className="font-semibold text-white">Scopri cani</Text>
      </Pressable>
    </View>
  );
}

// ── Estimated item height for getItemLayout (card height ~80px) ──────────────

const MATCH_CARD_HEIGHT = 84;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MatchesScreen() {
  const vm = useMatchesViewModel();

  const renderItem = useCallback(
    ({ item }: { item: EnrichedMatch }) => (
      <Pressable onPress={() => vm.navigateToChat(item.id)}>
        <MatchCard
          dogName={item.otherDog.name}
          ownerName={item.otherOwner.displayName}
          breed={item.otherDog.breed}
          matchedAt={String(item.createdAt)}
          compatibilityScore={item.compatibilityScore}
          myDogName={vm.hasMultipleDogs ? vm.dogNameById.get(item.dogId) : undefined}
        />
      </Pressable>
    ),
    [vm.navigateToChat, vm.hasMultipleDogs, vm.dogNameById],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<EnrichedMatch> | null | undefined, index: number) => ({
      length: MATCH_CARD_HEIGHT,
      offset: MATCH_CARD_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-100 px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">I tuoi Match</Text>
      </View>

      {/* Dog filter chips (only for multi-dog users) */}
      {vm.hasMultipleDogs && (
        <View className="border-b border-gray-100 px-4 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => vm.setFilterDogId(null)}
                className={`rounded-full px-4 py-2 ${!vm.filterDogId ? 'bg-primary' : 'bg-gray-100'}`}
              >
                <Text
                  className={`text-sm font-medium ${!vm.filterDogId ? 'text-white' : 'text-gray-700'}`}
                >
                  Tutti
                </Text>
              </Pressable>
              {vm.dogs.map((dog) => (
                <Pressable
                  key={dog.id}
                  onPress={() => vm.setFilterDogId(dog.id === vm.filterDogId ? null : dog.id)}
                  className={`rounded-full px-4 py-2 ${
                    vm.filterDogId === dog.id ? 'bg-primary' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      vm.filterDogId === dog.id ? 'text-white' : 'text-gray-700'
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

      {vm.isInitialLoad ? (
        <MatchesLoadingSkeleton />
      ) : (
        <FlatList
          data={vm.filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-2"
          onRefresh={vm.fetchMatches}
          refreshing={vm.loading}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          ListEmptyComponent={<MatchesEmptyState onDiscover={vm.navigateToDiscover} />}
        />
      )}
    </SafeAreaView>
  );
}
