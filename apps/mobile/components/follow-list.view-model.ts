import { FOLLOW_LIST_MODE, type FollowListMode } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { container } from 'tsyringe';
import type { FollowUser } from '@/repositories/interfaces/follow-repository';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export function useFollowListViewModel(mode: FollowListMode, userId: string) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      const isRefresh = !cursor;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        let data: { users: FollowUser[]; nextCursor: string | null };

        switch (mode) {
          case FOLLOW_LIST_MODE.FOLLOWERS:
            data = await followRepo.listFollowers(userId, cursor ?? undefined);
            break;
          case FOLLOW_LIST_MODE.FOLLOWING:
            data = await followRepo.listFollowing(userId, cursor ?? undefined);
            break;
          case FOLLOW_LIST_MODE.FRIENDS:
            data = await followRepo.listFriends(cursor ?? undefined);
            break;
        }

        if (isRefresh) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setNextCursor(data.nextCursor);
      } catch (e) {
        logger.warn('FollowList', `Failed to fetch ${mode}`, e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mode, userId],
  );

  useEffect(() => {
    void fetchPage(null);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    await fetchPage(null);
  }, [fetchPage]);

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    await fetchPage(nextCursor);
  }, [nextCursor, loading, fetchPage]);

  const isInitialLoad = loading && users.length === 0 && !refreshing;
  const isEmpty = !(loading || refreshing) && users.length === 0;

  return {
    users,
    loading,
    refreshing,
    isInitialLoad,
    isEmpty,
    refresh,
    fetchMore,
  };
}
