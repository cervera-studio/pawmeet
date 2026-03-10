import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface PendingPhoto {
  id: string;
  userId: string;
  userName: string;
  dogId: string | null;
  dogName: string | null;
  imageUrl: string;
  type: 'profile' | 'dog';
  uploadedAt: string;
}

export function usePhotoModerationViewModel() {
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['moderation-photos'],
    queryFn: () => api.get<PendingPhoto[]>('/admin/moderation/photos'),
  });

  const approveMutation = useMutation({
    mutationFn: (photoId: string) => api.post(`/admin/moderation/photos/${photoId}/approve`),
    onSuccess: (_data, photoId) => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], (old) =>
        old?.filter((p) => p.id !== photoId),
      );
      toast.success('Foto approvata');
    },
    onError: () => toast.error("Errore durante l'approvazione"),
  });

  const rejectMutation = useMutation({
    mutationFn: (photoId: string) => api.post(`/admin/moderation/photos/${photoId}/reject`),
    onSuccess: (_data, photoId) => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], (old) =>
        old?.filter((p) => p.id !== photoId),
      );
      toast.success('Foto rifiutata');
    },
    onError: () => toast.error('Errore durante il rifiuto'),
  });

  const approveAllMutation = useMutation({
    mutationFn: () => api.post('/admin/moderation/photos/approve-all'),
    onSuccess: () => {
      queryClient.setQueryData<PendingPhoto[]>(['moderation-photos'], []);
      toast.success('Tutte le foto approvate');
    },
    onError: () => toast.error("Errore durante l'approvazione"),
  });

  return {
    photos,
    isLoading,
    approveMutation,
    rejectMutation,
    approveAllMutation,
  };
}
