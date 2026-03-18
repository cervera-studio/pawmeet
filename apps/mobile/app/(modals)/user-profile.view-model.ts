import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { container } from 'tsyringe';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import type { FollowStatus } from '@/repositories/interfaces/follow-repository';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export function useUserProfileViewModel(userId: string) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<FollowStatus>({
    isFollowing: false,
    isFollowedByMe: false,
    isFollowingMe: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isCurrentUser = currentUser?.id === userId;

  useEffect(() => {
    if (isCurrentUser) return;

    followRepo
      .getFollowStatus(userId)
      .then(setStatus)
      .catch((e) => logger.warn('UserProfile', 'Failed to fetch follow status', e))
      .finally(() => setLoading(false));
  }, [userId, isCurrentUser]);

  const handleFollow = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      if (status.isFollowedByMe) {
        await followRepo.unfollow(userId);
        setStatus((prev) => ({ ...prev, isFollowedByMe: false, isFollowing: false }));
      } else {
        await followRepo.follow(userId);
        setStatus((prev) => ({ ...prev, isFollowedByMe: true, isFollowing: true }));
      }
    } catch (e) {
      logger.warn('UserProfile', 'Failed to toggle follow', e);
      Alert.alert(i18n.t('common.error'), i18n.t('userProfile.followError'));
    } finally {
      setActionLoading(false);
    }
  }, [userId, status.isFollowedByMe, actionLoading]);

  const handleBlock = useCallback(() => {
    Alert.alert(
      i18n.t('userProfile.blockTitle'),
      i18n.t('userProfile.blockMessage', { name: displayName || i18n.t('common.user') }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('userProfile.blockButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await followRepo.block(userId);
              Alert.alert(i18n.t('userProfile.blockedTitle'), i18n.t('userProfile.blockedMessage'));
              router.back();
            } catch (e) {
              logger.warn('UserProfile', 'Failed to block user', e);
              Alert.alert(i18n.t('common.error'), i18n.t('userProfile.blockError'));
            }
          },
        },
      ],
    );
  }, [userId, displayName, router]);

  const navigateToFollowers = useCallback(() => {
    router.push(`/(tabs)/profile/followers`);
  }, [router]);

  const navigateToFollowing = useCallback(() => {
    router.push(`/(tabs)/profile/following`);
  }, [router]);

  return {
    isCurrentUser,
    displayName,
    setDisplayName,
    avatarUrl,
    setAvatarUrl,
    status,
    loading,
    actionLoading,
    handleFollow,
    handleBlock,
    navigateToFollowers,
    navigateToFollowing,
  };
}
