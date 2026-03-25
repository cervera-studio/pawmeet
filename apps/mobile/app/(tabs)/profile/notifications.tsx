import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type NotificationItem,
  TYPE_ICONS,
  useNotificationsViewModel,
} from './_vm/notifications.view-model';

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

// ── Skeleton ────────────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <View className="px-4 py-4">
      {SKELETON_KEYS.map((id) => (
        <View
          key={id}
          className="mb-3 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse"
        />
      ))}
    </View>
  );
}

// ── Notification Row ────────────────────────────────────────────────────────

function NotificationRow({
  item,
  onPress,
}: {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}) {
  const { t } = useTranslation();
  const icon = TYPE_ICONS[item.type];

  const timeAgo = formatTimeAgo(item.date, t);

  return (
    <Pressable
      onPress={() => onPress(item)}
      className={`mb-2 flex-row items-center rounded-2xl p-4 shadow-sm ${
        item.read ? 'bg-neutral-100 dark:bg-[#2C2C2E]' : 'bg-white dark:bg-[#1C1C1E]'
      }`}
    >
      <Text className="text-2xl mr-4">{icon}</Text>
      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            item.read
              ? 'text-neutral-500 dark:text-neutral-500'
              : 'text-neutral-900 dark:text-[#F5F5F7]'
          }`}
          numberOfLines={1}
        >
          {item.title || t('notifications.noTitle')}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5" numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <View className="items-end ml-2">
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">{timeAgo}</Text>
        {!item.read && <View className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />}
      </View>
    </Pressable>
  );
}

function formatTimeAgo(
  date: Date,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('common.timeNow');
  if (diffMin < 60) return t('common.minuteAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('common.hourAgo', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t('common.dayAgo', { count: diffD });
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const vm = useNotificationsViewModel();

  useEffect(() => {
    void vm.fetchNotifications();
  }, [vm.fetchNotifications]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]">
      {vm.loading && vm.notifications.length === 0 ? (
        <NotificationsSkeleton />
      ) : (
        <FlatList
          data={vm.notifications}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 py-4"
          renderItem={({ item }) => <NotificationRow item={item} onPress={vm.handleTap} />}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">{'\u{1F514}'}</Text>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center">
                {t('notifications.empty')}
              </Text>
            </View>
          }
          refreshing={vm.loading}
          onRefresh={vm.fetchNotifications}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
