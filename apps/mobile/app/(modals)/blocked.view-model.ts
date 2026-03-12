import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { container } from 'tsyringe';
import type { BlockedUser } from '@/repositories/interfaces/follow-repository';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export function useBlockedViewModel() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(async (cursor?: string | null) => {
    const isRefresh = !cursor;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await followRepo.listBlocked(cursor ?? undefined);
      if (isRefresh) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [...prev, ...data.users]);
      }
      setNextCursor(data.nextCursor);
    } catch (e) {
      logger.warn('BlockedScreen', 'Failed to fetch blocked users', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const handleUnblock = useCallback((userId: string, displayName: string) => {
    Alert.alert('Sblocca utente', `Vuoi sbloccare ${displayName}?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Sblocca',
        onPress: async () => {
          try {
            await followRepo.unblock(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
          } catch (e) {
            logger.warn('BlockedScreen', 'Failed to unblock user', e);
            Alert.alert('Errore', "Impossibile sbloccare l'utente. Riprova.");
          }
        },
      },
    ]);
  }, []);

  const isInitialLoad = loading && users.length === 0 && !refreshing;
  const isEmpty = !loading && !refreshing && users.length === 0;

  return {
    users,
    loading,
    refreshing,
    isInitialLoad,
    isEmpty,
    refresh,
    fetchMore,
    handleUnblock,
  };
}
