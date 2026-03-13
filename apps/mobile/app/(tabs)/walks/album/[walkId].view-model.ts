import type { RouterOutput } from '@pawmeet/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { isValidUUID } from '@/lib/deep-link-validation';
import { api } from '@/lib/trpc';

type WalkAlbumData = RouterOutput['feed']['walkAlbum'];

export function useWalkAlbumViewModel() {
  const { walkId } = useLocalSearchParams<{ walkId: string }>();
  const router = useRouter();
  const [paramError, setParamError] = useState<string | null>(null);
  const [album, setAlbum] = useState<WalkAlbumData | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate deep link param
  useEffect(() => {
    if (walkId && !isValidUUID(walkId)) {
      setParamError('ID passeggiata non valido');
      setLoading(false);
    }
  }, [walkId]);

  const validWalkId = walkId && isValidUUID(walkId) ? walkId : undefined;

  const fetchAlbum = useCallback(async () => {
    if (!validWalkId) return;
    setLoading(true);
    try {
      const data = await api.feed.walkAlbum.query({ walkId: validWalkId });
      setAlbum(data);
    } catch {
      // Album may not exist yet
      setAlbum(null);
    } finally {
      setLoading(false);
    }
  }, [validWalkId]);

  useEffect(() => {
    void fetchAlbum();
  }, [fetchAlbum]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    walkId: validWalkId,
    paramError,
    album,
    loading,
    goBack,
    refresh: fetchAlbum,
  };
}
