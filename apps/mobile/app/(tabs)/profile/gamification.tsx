import { Stack } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGamificationViewModel } from './_vm/gamification.view-model';

// ── Skeleton ────────────────────────────────────────────────────────────────

function GamificationSkeleton() {
  return (
    <View className="px-4 py-4">
      <View className="mb-6 h-24 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      <View className="mb-4 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      <View className="mb-4 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      <View className="mb-4 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
    </View>
  );
}

// ── XP Progress Bar ─────────────────────────────────────────────────────────

function XpProgressBar({ currentXp, xpToNext }: { currentXp: number; xpToNext: number | null }) {
  const progress = xpToNext != null && xpToNext > 0 ? currentXp / (currentXp + xpToNext) : 1;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View className="mt-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-neutral-500 dark:text-neutral-500">{currentXp} XP</Text>
        {xpToNext == null ? null : (
          <Text className="text-xs text-neutral-500 dark:text-neutral-500">
            {currentXp + xpToNext} XP
          </Text>
        )}
      </View>
      <View className="h-3 rounded-full bg-neutral-200 dark:bg-[#48484A] overflow-hidden">
        <View
          className="h-3 rounded-full bg-primary"
          style={{ width: `${Math.round(clampedProgress * 100)}%` }}
        />
      </View>
      {xpToNext == null ? (
        <Text className="mt-1 text-xs text-primary text-center font-medium">
          Livello massimo raggiunto!
        </Text>
      ) : (
        <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-500 text-center">
          {xpToNext} XP al prossimo livello
        </Text>
      )}
    </View>
  );
}

// ── Navigation Card ─────────────────────────────────────────────────────────

function NavCard({
  emoji,
  title,
  subtitle,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm"
    >
      <Text className="text-2xl mr-4">{emoji}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-[#F5F5F7]">
          {title}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-500">{subtitle}</Text>
      </View>
      <Text className="text-neutral-400 dark:text-neutral-500">{'\u203A'}</Text>
    </Pressable>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function GamificationScreen() {
  const vm = useGamificationViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Gamification',
          headerBackTitle: 'Profilo',
        }}
      />

      {vm.loading && !vm.xpSummary ? (
        <GamificationSkeleton />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
          {/* XP summary card */}
          {vm.xpSummary ? (
            <View className="mb-6 rounded-2xl bg-white dark:bg-[#1C1C1E] p-5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm text-neutral-500 dark:text-neutral-500">
                    Il tuo livello
                  </Text>
                  <Text className="text-2xl font-bold text-primary">{vm.xpSummary.level}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-3xl font-bold text-neutral-900 dark:text-[#F5F5F7]">
                    {vm.xpSummary.totalXp}
                  </Text>
                  <Text className="text-xs text-neutral-500 dark:text-neutral-500">XP totali</Text>
                </View>
              </View>
              <XpProgressBar
                currentXp={vm.xpSummary.totalXp}
                xpToNext={vm.xpSummary.xpToNextLevel}
              />
            </View>
          ) : null}

          {/* Navigation cards */}
          <NavCard
            emoji={'\u{1F3C6}'}
            title="Classifica"
            subtitle="Confronta i tuoi punti con gli altri"
            onPress={vm.navigateToLeaderboard}
          />
          <NavCard
            emoji={'\u{1F3AF}'}
            title="Sfide"
            subtitle="Sfide settimanali per guadagnare XP"
            onPress={vm.navigateToChallenges}
          />
          <NavCard
            emoji={'\u{1F396}\u{FE0F}'}
            title="Obiettivi"
            subtitle="I tuoi traguardi raggiunti"
            onPress={vm.navigateToAchievements}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
