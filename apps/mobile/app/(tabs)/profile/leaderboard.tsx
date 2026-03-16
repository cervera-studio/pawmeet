import type { LeaderboardEntry } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLeaderboardViewModel } from './leaderboard.view-model';

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

// ── Skeleton ────────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <View className="px-4 py-4">
      <View className="mb-4 h-10 rounded-xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      {SKELETON_KEYS.map((id) => (
        <View
          key={id}
          className="mb-2 h-16 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse"
        />
      ))}
    </View>
  );
}

// ── Rank badge ──────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Text className="text-xl">{'\u{1F947}'}</Text>;
  if (rank === 2) return <Text className="text-xl">{'\u{1F948}'}</Text>;
  if (rank === 3) return <Text className="text-xl">{'\u{1F949}'}</Text>;
  return (
    <View className="h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-[#48484A]">
      <Text className="text-sm font-bold text-neutral-700 dark:text-[#D1D1D6]">{rank}</Text>
    </View>
  );
}

// ── Leaderboard row ─────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  return (
    <View
      className={`mb-2 flex-row items-center rounded-2xl p-4 shadow-sm ${
        isCurrentUser
          ? 'bg-primary/10 dark:bg-primary/20 border border-primary'
          : 'bg-white dark:bg-[#1C1C1E]'
      }`}
    >
      <View className="mr-3">
        <RankBadge rank={entry.rank} />
      </View>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-[#48484A] mr-3">
        <Text className="text-sm font-bold text-neutral-700 dark:text-[#D1D1D6]">
          {entry.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            isCurrentUser ? 'text-primary' : 'text-neutral-900 dark:text-[#F5F5F7]'
          }`}
        >
          {entry.displayName}
          {isCurrentUser ? ' (tu)' : ''}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-500">
          Livello: {entry.level}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold text-neutral-900 dark:text-[#F5F5F7]">
          {entry.totalXp}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-500">XP</Text>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const vm = useLeaderboardViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Classifica',
          headerBackTitle: 'Gamification',
        }}
      />

      {vm.loading && vm.entries.length === 0 ? (
        <LeaderboardSkeleton />
      ) : (
        <View className="flex-1 px-4 py-4">
          {/* Type toggle */}
          <View className="mb-4 flex-row rounded-xl bg-white dark:bg-[#1C1C1E] p-1 shadow-sm">
            <Pressable
              onPress={() => vm.changeType('weekly')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.type === 'weekly' ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`font-medium ${
                  vm.type === 'weekly' ? 'text-white' : 'text-neutral-700 dark:text-[#D1D1D6]'
                }`}
              >
                Settimanale
              </Text>
            </Pressable>
            <Pressable
              onPress={() => vm.changeType('allTime')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.type === 'allTime' ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`font-medium ${
                  vm.type === 'allTime' ? 'text-white' : 'text-neutral-700 dark:text-[#D1D1D6]'
                }`}
              >
                Sempre
              </Text>
            </Pressable>
          </View>

          {/* Leaderboard list */}
          <FlatList
            data={vm.entries}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => (
              <LeaderboardRow entry={item} isCurrentUser={item.userId === vm.currentUserId} />
            )}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-4xl mb-3">{'\u{1F3C6}'}</Text>
                <Text className="text-neutral-500 dark:text-neutral-500 text-center">
                  La classifica è ancora vuota.{'\n'}Inizia a passeggiare per salire in classifica!
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
