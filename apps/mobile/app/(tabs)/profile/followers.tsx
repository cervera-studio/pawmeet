export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FollowList } from '@/components/follow-list';
import { useAuth } from '@/hooks/useAuth';

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleUserPress = (targetUserId: string) => {
    router.push({ pathname: '/(modals)/user-profile', params: { userId: targetUserId } });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <FollowList
        mode="followers"
        userId={user?.id ?? ''}
        currentUserId={user?.id}
        onUserPress={handleUserPress}
      />
    </SafeAreaView>
  );
}
