import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/Avatar';
import { useUserProfileViewModel } from './user-profile.view-model';

export default function UserProfileScreen() {
  const { userId, name, avatar } = useLocalSearchParams<{
    userId: string;
    name?: string;
    avatar?: string;
  }>();

  const vm = useUserProfileViewModel(userId);

  // Set display data from route params
  if (name && vm.displayName !== name) vm.setDisplayName(name);
  if (avatar && vm.avatarUrl !== avatar) vm.setAvatarUrl(avatar);

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#065F46" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="items-center px-4 pt-8">
        <Avatar name={vm.displayName || 'Utente'} imageUrl={vm.avatarUrl} size="lg" />

        <Text className="mt-3 text-xl font-bold text-gray-900">{vm.displayName || 'Utente'}</Text>

        {/* Follow status label */}
        {vm.status.isFollowingMe && <Text className="mt-1 text-xs text-gray-400">Ti segue</Text>}

        {/* Action buttons */}
        {!vm.isCurrentUser && (
          <View className="mt-5 flex-row items-center gap-3">
            <FollowButton userId={userId} size="md" />

            <Pressable
              onPress={vm.handleBlock}
              className="rounded-xl border border-red-300 px-5 py-2.5"
            >
              <Text className="text-sm font-semibold text-red-500">Blocca</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
