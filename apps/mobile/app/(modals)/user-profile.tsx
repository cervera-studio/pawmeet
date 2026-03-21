import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FollowButton } from '@/components/follow-button';
import { Avatar } from '@/components/ui/Avatar';
import { isValidUUID } from '@/lib/deep-link-validation';
import { useUserProfileViewModel } from './user-profile.view-model';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { t } = useTranslation();
  const validUserId = userId && isValidUUID(userId) ? userId : undefined;
  const vm = useUserProfileViewModel(validUserId);

  // name/avatar fetched from backend via view model — never trust URL params

  if (vm.loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <ActivityIndicator size="large" color="#065F46" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <View className="items-center px-4 pt-8">
        <Avatar name={vm.displayName || t('common.user')} imageUrl={vm.avatarUrl} size="lg" />

        <Text className="mt-3 text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {vm.displayName || t('common.user')}
        </Text>

        {/* Follow status label */}
        {vm.status.isFollowingMe && (
          <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">Ti segue</Text>
        )}

        {/* Action buttons */}
        {!vm.isCurrentUser && (
          <View className="mt-5 flex-row items-center gap-3">
            <FollowButton userId={userId} size="md" />

            <Pressable
              onPress={vm.handleBlock}
              className="rounded-xl border border-red-300 px-5 py-2.5"
            >
              <Text className="text-sm font-semibold text-red-500">{t('common.block')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
