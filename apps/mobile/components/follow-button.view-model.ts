import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { container } from 'tsyringe';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export type FollowState = 'idle' | 'following' | 'follows_you' | 'loading';

export function useFollowButtonViewModel(userId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingMe, setIsFollowingMe] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    followRepo
      .getFollowStatus(userId)
      .then((status) => {
        setIsFollowing(status.isFollowedByMe);
        setIsFollowingMe(status.isFollowingMe);
      })
      .catch((e) => logger.warn('FollowButton', 'Failed to fetch follow status', e))
      .finally(() => setLoading(false));
  }, [userId]);

  const handlePress = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await followRepo.unfollow(userId);
        setIsFollowing(false);
      } else {
        await followRepo.follow(userId);
        setIsFollowing(true);
      }
    } catch (e) {
      logger.warn('FollowButton', 'Failed to toggle follow', e);
      Alert.alert('Errore', "Impossibile completare l'azione. Riprova.");
    } finally {
      setLoading(false);
    }
  }, [userId, isFollowing, loading]);

  const state: FollowState = (() => {
    if (loading) return 'loading';
    if (isFollowing) return 'following';
    if (isFollowingMe) return 'follows_you';
    return 'idle';
  })();

  return {
    state,
    isFollowing,
    isFollowingMe,
    loading,
    handlePress,
  };
}
