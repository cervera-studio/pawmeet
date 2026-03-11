import type { RouterOutput } from '@dogwalk/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/trpc';

type WalkAlbumData = RouterOutput['feed']['walkAlbum'];

export function useWalkAlbumViewModel() {
  const { walkId } = useLocalSearchParams<{ walkId: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<WalkAlbumData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlbum = useCallback(async () => {
    if (!walkId) return;
    setLoading(true);
    try {
      const data = await api.feed.walkAlbum.query({ walkId });
      setAlbum(data);
    } catch {
      // Album may not exist yet
      setAlbum(null);
    } finally {
      setLoading(false);
    }
  }, [walkId]);

  useEffect(() => {
    void fetchAlbum();
  }, [fetchAlbum]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    walkId,
    album,
    loading,
    goBack,
    refresh: fetchAlbum,
  };
}
