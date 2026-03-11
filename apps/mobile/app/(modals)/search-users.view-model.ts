import { logger } from '@dogwalk/utils';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { container } from 'tsyringe';
import type { FollowUser } from '@/repositories/interfaces/follow-repository';
import { FOLLOW_REPOSITORY } from '@/repositories/tokens';

const followRepo = container.resolve(FOLLOW_REPOSITORY);

export function useSearchUsersViewModel() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await followRepo.searchUsers(text);
        setResults(data);
      } catch (e) {
        logger.warn('SearchUsers', 'Failed to search', e);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const navigateToUser = useCallback(
    (user: FollowUser) => {
      router.push({
        pathname: '/(modals)/user-profile',
        params: {
          userId: user.id,
          name: user.displayName,
          avatar: user.avatarUrl ?? undefined,
        },
      });
    },
    [router],
  );

  const isEmpty = !loading && query.length >= 2 && results.length === 0;

  return {
    query,
    results,
    loading,
    isEmpty,
    search,
    navigateToUser,
  };
}
