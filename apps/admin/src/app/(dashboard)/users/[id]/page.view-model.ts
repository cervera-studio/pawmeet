import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { USER_STATUS_CONFIG } from '@/components/StatusBadge';
import { usePermission } from '@/hooks/use-permission';
import { type AdminUserDetail, userRepository } from '@/repositories';

/** @deprecated Use USER_STATUS_CONFIG from StatusBadge instead */
export const STATUS_MAP = USER_STATUS_CONFIG;

export function useUserDetailViewModel() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = usePermission();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await userRepository.getById(params.id);
      setUser(data);
    } catch (error) {
      console.error('[UserDetail] Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  async function handleSuspend() {
    try {
      await userRepository.suspend(params.id);
      toast.success('Utente sospeso');
      void fetchUser();
    } catch {
      toast.error('Errore durante la sospensione');
    }
  }

  async function handleBan() {
    try {
      await userRepository.ban(params.id);
      toast.success('Utente bannato');
      void fetchUser();
    } catch {
      toast.error('Errore durante il ban');
    }
  }

  async function handleReactivate() {
    try {
      await userRepository.reactivate(params.id);
      toast.success('Utente riattivato');
      void fetchUser();
    } catch {
      toast.error('Errore durante la riattivazione');
    }
  }

  const statusInfo = user
    ? (STATUS_MAP[user.status] ?? { label: 'Sconosciuto', variant: 'outline' as const })
    : { label: 'Sconosciuto', variant: 'outline' as const };

  const navigateToReports = useCallback(() => {
    router.push(`/moderation/reports?user=${params.id}`);
  }, [router, params.id]);

  const navigateToPhotos = useCallback(() => {
    router.push(`/moderation/photos?user=${params.id}`);
  }, [router, params.id]);

  return {
    user,
    isLoading,
    isAdmin,
    statusInfo,
    handleSuspend,
    handleBan,
    handleReactivate,
    navigateToReports,
    navigateToPhotos,
  };
}
