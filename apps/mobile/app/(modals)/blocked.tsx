import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import type { BlockedUser } from '@/repositories/interfaces/follow-repository';
import { useBlockedViewModel } from './_vm/blocked.view-model';

// ── Loading Skeleton ──────────────────────────────────────────────────────

function BlockedSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          <View className="flex-1">
            <View className="h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          </View>
          <View className="h-8 w-20 rounded-xl bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        </View>
      ))}
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────

function EmptyBlocked() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {t('blocked.noBlocked')}
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        {t('blocked.noBlockedDescription')}
      </Text>
    </View>
  );
}

// ── Blocked User Row ─────────────────────────────────────────────────────

const BlockedUserRow = memo(function BlockedUserRow({
  user,
  onUnblock,
}: {
  user: BlockedUser;
  onUnblock: (userId: string, displayName: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Avatar name={user.displayName} imageUrl={user.avatarUrl} size="sm" />
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
          {user.displayName}
        </Text>
      </View>
      <Pressable
        onPress={() => onUnblock(user.id, user.displayName)}
        className="rounded-xl border border-red-300 px-4 py-1.5"
      >
        <Text className="text-xs font-semibold text-red-500">{t('common.unblock')}</Text>
      </Pressable>
    </View>
  );
});

// ── Screen ───────────────────────────────────────────────────────────────

export default function BlockedScreen() {
  const vm = useBlockedViewModel();

  if (vm.isInitialLoad) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
        <BlockedSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <FlatList
        data={vm.users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BlockedUserRow user={item} onUnblock={vm.handleUnblock} />}
        ListEmptyComponent={<EmptyBlocked />}
        refreshing={vm.refreshing}
        onRefresh={vm.refresh}
        onEndReached={vm.fetchMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
