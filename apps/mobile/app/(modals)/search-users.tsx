import { memo } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/Avatar';
import type { FollowUser } from '@/repositories/interfaces/follow-repository';
import { useSearchUsersViewModel } from './search-users.view-model';

const UserRow = memo(function UserRow({
  user,
  onPress,
}: {
  user: FollowUser;
  onPress: (user: FollowUser) => void;
}) {
  return (
    <Pressable onPress={() => onPress(user)} className="flex-row items-center gap-3 px-4 py-3">
      <Avatar name={user.displayName} imageUrl={user.avatarUrl} size="sm" />
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900 dark:text-[#F5F5F7]">
          {user.displayName}
        </Text>
      </View>
      <FollowButton userId={user.id} size="sm" />
    </Pressable>
  );
});

export default function SearchUsersScreen() {
  const vm = useSearchUsersViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      {/* Search bar */}
      <View className="border-b border-gray-100 dark:border-[#38383A] px-4 py-3">
        <TextInput
          placeholder="Cerca utenti..."
          value={vm.query}
          onChangeText={vm.search}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className="rounded-xl bg-gray-100 dark:bg-[#38383A] px-4 py-3 text-base text-gray-900 dark:text-[#F5F5F7]"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Loading */}
      {vm.loading && (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#065F46" />
        </View>
      )}

      {/* Empty state */}
      {vm.isEmpty && (
        <View className="items-center px-8 pt-20">
          <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
            Nessun risultato
          </Text>
          <Text className="text-center text-sm text-gray-500 dark:text-neutral-500">
            Prova a cercare con un nome diverso.
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={vm.results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserRow user={item} onPress={vm.navigateToUser} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}
