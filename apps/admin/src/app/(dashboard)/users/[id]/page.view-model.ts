import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { USER_STATUS_CONFIG } from '@/components/StatusBadge';
import { usePermission } from '@/hooks/use-permission';
import { api } from '@/lib/api';

interface UserDetail {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: 'active' | 'suspended' | 'banned';
  authProvider: string;
  createdAt: string;
  lastLoginAt: string | null;
  dogs: {
    id: string;
    name: string;
    breed: string;
    isActive: boolean;
  }[];
  reportsReceived: number;
  matchesCount: number;
}

/** @deprecated Use USER_STATUS_CONFIG from StatusBadge instead */
export const STATUS_MAP = USER_STATUS_CONFIG;

function useUserActionMutation(
  userId: string,
  action: string,
  successMsg: string,
  errorMsg: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast.success(successMsg);
    },
    onError: () => toast.error(errorMsg),
  });
}

export function useUserDetailViewModel() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = usePermission();

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', params.id],
    queryFn: () => api.get<UserDetail>(`/admin/users/${params.id}`),
  });

  const suspendMutation = useUserActionMutation(
    params.id,
    'suspend',
    'Utente sospeso',
    'Errore durante la sospensione',
  );

  const banMutation = useUserActionMutation(
    params.id,
    'ban',
    'Utente bannato',
    'Errore durante il ban',
  );

  const reactivateMutation = useUserActionMutation(
    params.id,
    'reactivate',
    'Utente riattivato',
    'Errore durante la riattivazione',
  );

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
    suspendMutation,
    banMutation,
    reactivateMutation,
    navigateToReports,
    navigateToPhotos,
  };
}
