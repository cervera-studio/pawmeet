import type { ChallengeWithProgress } from '@pawmeet/types';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChallengesViewModel } from './_challenges.view-model';

const SKELETON_KEYS = ['a', 'b', 'c', 'd'] as const;

// ── Skeleton ────────────────────────────────────────────────────────────────

function ChallengesSkeleton() {
  return (
    <View className="px-4 py-4">
      {SKELETON_KEYS.map((id) => (
        <View
          key={id}
          className="mb-3 h-28 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse"
        />
      ))}
    </View>
  );
}

// ── Time remaining helper ───────────────────────────────────────────────────

function formatTimeRemaining(
  endsAt: Date | string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const end = typeof endsAt === 'string' ? new Date(endsAt) : endsAt;
  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return t('profile.challenges.expired');
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 24) return t('profile.challenges.hoursLeft', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t('profile.challenges.daysLeft', { count: diffD });
}

// ── Progress bar ────────────────────────────────────────────────────────────

function ChallengeProgressBar({
  progress,
  target,
  endsAt,
}: {
  progress: number;
  target: number;
  endsAt: Date | string;
}) {
  const { t } = useTranslation();
  const ratio = target > 0 ? Math.min(progress / target, 1) : 0;
  const timeLeft = formatTimeRemaining(endsAt, t);

  return (
    <View className="mt-2">
      <View className="h-2.5 rounded-full bg-neutral-200 dark:bg-[#48484A] overflow-hidden">
        <View
          className={`h-2.5 rounded-full ${ratio >= 1 ? 'bg-green-500' : 'bg-primary'}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-neutral-500 dark:text-neutral-500">
          {progress} / {target}
        </Text>
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">{timeLeft}</Text>
      </View>
    </View>
  );
}

// ── Challenge Card ──────────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: ChallengeWithProgress }) {
  const { t } = useTranslation();
  const isCompleted = challenge.completedAt != null;

  return (
    <View
      className={`mb-3 rounded-2xl p-4 shadow-sm ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-[#1C1C1E]'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2">
            {isCompleted ? <Text className="text-lg">{'\u2705'}</Text> : null}
            <Text
              className={`text-base font-semibold ${
                isCompleted
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-neutral-900 dark:text-[#F5F5F7]'
              }`}
            >
              {challenge.title}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            {challenge.description}
          </Text>
        </View>
        <View className="items-center rounded-lg bg-primary/10 dark:bg-primary/20 px-3 py-1.5">
          <Text className="text-sm font-bold text-primary">+{challenge.xpReward}</Text>
          <Text className="text-xs text-primary">XP</Text>
        </View>
      </View>

      {isCompleted ? (
        <Text className="mt-2 text-xs text-green-600 dark:text-green-400">
          {t('profile.challenges.completed')}
        </Text>
      ) : (
        <ChallengeProgressBar
          progress={challenge.progress}
          target={challenge.targetValue}
          endsAt={challenge.endsAt}
        />
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const vm = useChallengesViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.challenges.title'),
          headerBackTitle: t('profile.challenges.backButton'),
        }}
      />

      {vm.loading && vm.challenges.length === 0 ? (
        <ChallengesSkeleton />
      ) : (
        <FlatList
          data={vm.challenges}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-4"
          renderItem={({ item }) => <ChallengeCard challenge={item} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">{'\u{1F3AF}'}</Text>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center">
                {t('profile.challenges.noChallenges')}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
