import type { RouterOutput } from '@pawmeet/api-client';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

type WalkAlbum = RouterOutput['feed']['walkAlbum'];
type AlbumMedia = WalkAlbum['posts'][number]['media'][number];

export type { AlbumMedia, WalkAlbum };

export function useWalkAlbumViewModel() {
  const { walkId } = useLocalSearchParams<{ walkId: string }>();

  const [album, setAlbum] = useState<WalkAlbum | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlbum = useCallback(async () => {
    if (!walkId) return;
    setLoading(true);
    try {
      const { api } = await import('@/lib/trpc');
      const data = await api.feed.walkAlbum.query({ walkId });
      setAlbum(data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [walkId]);

  useEffect(() => {
    void fetchAlbum();
  }, [fetchAlbum]);

  return {
    album,
    media: album?.posts.flatMap((p) => p.media) ?? [],
    loading,
  };
}
