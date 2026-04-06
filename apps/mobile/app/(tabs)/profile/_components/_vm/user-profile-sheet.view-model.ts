import type { PublicUserProfile } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { container } from 'tsyringe';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import type { FollowStatus } from '@/repositories/interfaces/follow-repository';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

/** tRPC serializes Date as string over the wire. */
type SerializedPublicUserProfile = Omit<PublicUserProfile, 'createdAt'> & {
  createdAt: string;
};

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export function useUserProfileSheetViewModel(userId: string | null) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<SerializedPublicUserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>({
    isFollowing: false,
    isFollowedByMe: false,
    isFollowingMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentUser = currentUser?.id === userId;

  useEffect(() => {
    if (!userId || isCurrentUser) {
      setProfile(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([api.users.getPublicProfile.query({ userId }), followRepo.getFollowStatus(userId)])
      .then(([profileData, status]) => {
        setProfile(profileData);
        setFollowStatus(status);
      })
      .catch((e) => {
        logger.warn('UserProfileSheet', 'Failed to fetch profile', e);
        setError(i18n.t('userProfile.profileSheet.errorLoading'));
      })
      .finally(() => setLoading(false));
  }, [userId, isCurrentUser]);

  const handleBlock = useCallback(() => {
    if (!userId) return;

    Alert.alert(
      i18n.t('userProfile.blockTitle'),
      i18n.t('userProfile.blockMessage', {
        name: profile?.displayName || i18n.t('common.user'),
      }),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('userProfile.blockButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await followRepo.block(userId);
              Alert.alert(i18n.t('userProfile.blockedTitle'), i18n.t('userProfile.blockedMessage'));
            } catch (e) {
              logger.warn('UserProfileSheet', 'Failed to block user', e);
              Alert.alert(i18n.t('common.error'), i18n.t('userProfile.blockError'));
            }
          },
        },
      ],
    );
  }, [userId, profile?.displayName]);

  return {
    profile,
    followStatus,
    loading,
    error,
    isCurrentUser,
    handleBlock,
  };
}
