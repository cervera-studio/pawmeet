import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDateLocale } from '@/lib/i18n';
import { type BadgeCardData, useBadgesGridViewModel } from './_vm/badges.view-model';

const SKELETON_KEYS_4 = ['a', 'b', 'c', 'd'] as const;

// ── Skeleton ────────────────────────────────────────────────────────────────

function BadgesSkeleton() {
  return (
    <View className="px-4 py-4 flex-row flex-wrap gap-3">
      {SKELETON_KEYS_4.map((id) => (
        <View
          key={id}
          className="h-36 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse"
          style={{ width: '47%' }}
        />
      ))}
    </View>
  );
}

// ── Badge Card ──────────────────────────────────────────────────────────────

function BadgeCard({ card }: { card: BadgeCardData }) {
  const { t } = useTranslation();
  const formattedDate = card.unlockedAt
    ? new Date(card.unlockedAt).toLocaleDateString(getDateLocale(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <View
      className={`rounded-2xl p-4 items-center justify-center shadow-sm ${
        card.unlocked ? 'bg-white dark:bg-[#1C1C1E]' : 'bg-neutral-200 dark:bg-[#48484A]'
      }`}
      style={{ width: '47%', minHeight: 140 }}
    >
      <Text className={`text-3xl mb-2 ${card.unlocked ? '' : 'opacity-30'}`}>{card.icon}</Text>
      <Text
        className={`text-sm font-semibold text-center ${
          card.unlocked
            ? 'text-neutral-900 dark:text-[#F5F5F7]'
            : 'text-neutral-400 dark:text-neutral-500'
        }`}
      >
        {card.label}
      </Text>
      {card.unlocked && formattedDate ? (
        <Text className="mt-1 text-xs text-primary text-center">{formattedDate}</Text>
      ) : (
        <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {t('profile.dogBadges.locked')}
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function DogBadgesScreen() {
  const { t } = useTranslation();
  const vm = useBadgesGridViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.dogBadges.title'),
          headerBackTitle: t('common.back'),
        }}
      />

      {vm.loading && vm.cards.length === 0 ? (
        <BadgesSkeleton />
      ) : (
        <FlatList
          data={vm.cards}
          keyExtractor={(item) => item.type}
          numColumns={2}
          columnWrapperClassName="justify-between px-4 mb-3"
          contentContainerClassName="py-4"
          renderItem={({ item }) => <BadgeCard card={item} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">{'\u{1F396}\u{FE0F}'}</Text>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center">
                {t('profile.dogDetail.noBadges')}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
