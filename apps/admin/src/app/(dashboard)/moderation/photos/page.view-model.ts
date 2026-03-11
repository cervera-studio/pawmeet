import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type PendingPhoto, photoModerationRepository } from '@/repositories';

export function usePhotoModerationViewModel() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await photoModerationRepository.listPending();
      setPhotos(data);
    } catch (error) {
      console.error('[PhotoModeration] Failed to fetch photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPhotos();
  }, [fetchPhotos]);

  async function handleApprove(photoId: string) {
    try {
      await photoModerationRepository.approve(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Foto approvata');
    } catch {
      toast.error("Errore durante l'approvazione");
    }
  }

  async function handleReject(photoId: string) {
    try {
      await photoModerationRepository.reject(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Foto rifiutata');
    } catch {
      toast.error('Errore durante il rifiuto');
    }
  }

  async function handleApproveAll() {
    try {
      await photoModerationRepository.approveAll();
      setPhotos([]);
      toast.success('Tutte le foto approvate');
    } catch {
      toast.error("Errore durante l'approvazione");
    }
  }

  return {
    photos,
    isLoading,
    handleApprove,
    handleReject,
    handleApproveAll,
  };
}
