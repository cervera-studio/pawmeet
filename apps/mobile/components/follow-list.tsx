import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { FollowUser } from '@/repositories/interfaces/follow-repository';
import { FollowButton } from './follow-button';
import { useFollowListViewModel } from './follow-list.view-model';
import { Avatar } from './ui/Avatar';

// ── Loading Skeleton ──────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <View className="px-4 pt-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="mb-3 flex-row items-center gap-3">
          <View className="h-12 w-12 rounded-full bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          <View className="flex-1">
            <View className="mb-1 h-4 w-32 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
            <View className="h-3 w-20 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse" />
          </View>
          <View className="h-8 w-20 rounded-xl bg-gray-200 dark:bg-[#48484A] animate-pulse" />
        </View>
      ))}
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────

type EmptyMessages = {
  followers: { title: string; subtitle: string };
  following: { title: string; subtitle: string };
  friends: { title: string; subtitle: string };
};

const EMPTY_MESSAGES: EmptyMessages = {
  followers: {
    title: 'Nessun follower',
    subtitle: 'Quando qualcuno ti seguirà, apparirà qui.',
  },
  following: {
    title: 'Non segui nessuno',
    subtitle: 'Inizia a seguire altri proprietari per restare aggiornato!',
  },
  friends: {
    title: 'Nessun amico ancora',
    subtitle: 'Gli amici sono le persone che segui e che ti seguono a loro volta.',
  },
};

function EmptyState({ mode }: { mode: 'followers' | 'following' | 'friends' }) {
  const messages = EMPTY_MESSAGES[mode];
  return (
    <View className="flex-1 items-center justify-center px-8 pt-20">
      <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
        {messages.title}
      </Text>
      <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
        {messages.subtitle}
      </Text>
    </View>
  );
}

// ── User Row ─────────────────────────────────────────────────────────────

const UserRow = memo(function UserRow({
  user,
  currentUserId,
  onPress,
}: {
  user: FollowUser;
  currentUserId: string | undefined;
  onPress: (userId: string) => void;
}) {
  const isCurrentUser = currentUserId === user.id;

  return (
    <Pressable onPress={() => onPress(user.id)} className="flex-row items-center gap-3 px-4 py-3">
      <Avatar name={user.displayName} imageUrl={user.avatarUrl} size="sm" />
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
          {user.displayName}
        </Text>
        {user.isFollowingMe && !user.isFollowedByMe ? (
          <Text className="text-xs text-gray-400 dark:text-neutral-500">Ti segue</Text>
        ) : null}
      </View>
      {isCurrentUser ? null : <FollowButton userId={user.id} size="sm" />}
    </Pressable>
  );
});

// ── Main Component ───────────────────────────────────────────────────────

type Props = {
  mode: 'followers' | 'following' | 'friends';
  userId: string;
  currentUserId?: string;
  onUserPress: (userId: string) => void;
};

export function FollowList({ mode, userId, currentUserId, onUserPress }: Props) {
  const vm = useFollowListViewModel(mode, userId);

  if (vm.isInitialLoad) {
    return <ListSkeleton />;
  }

  return (
    <FlatList
      data={vm.users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <UserRow user={item} currentUserId={currentUserId} onPress={onUserPress} />
      )}
      ListEmptyComponent={<EmptyState mode={mode} />}
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      onEndReached={vm.fetchMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}
