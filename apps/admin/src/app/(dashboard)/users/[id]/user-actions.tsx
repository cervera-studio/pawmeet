'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { banUser, reactivateUser, suspendUser } from '../actions';

type UserStatus = 'active' | 'suspended' | 'banned';

interface UserActionsProps {
  userId: string;
  initialStatus: UserStatus;
}

export function UserActions({ userId, initialStatus }: UserActionsProps) {
  const { isAdmin } = usePermission();
  const tt = useTranslations('toast');

  if (!isAdmin) {
    return null;
  }

  async function handleSuspend() {
    const result = await suspendUser(userId);
    if (result.success) {
      toast.success(tt('users.suspended'));
    } else {
      toast.error(result.error ?? tt('users.suspendError'));
    }
  }

  async function handleBan() {
    const result = await banUser(userId);
    if (result.success) {
      toast.success(tt('users.banned'));
    } else {
      toast.error(result.error ?? tt('users.banError'));
    }
  }

  async function handleReactivate() {
    const result = await reactivateUser(userId);
    if (result.success) {
      toast.success(tt('users.reactivated'));
    } else {
      toast.error(result.error ?? tt('users.reactivateError'));
    }
  }

  return (
    <>
      {initialStatus === 'active' && (
        <>
          <Button variant="outline" size="sm" onClick={handleSuspend}>
            Sospendi
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBan}>
            Banna
          </Button>
        </>
      )}
      {(initialStatus === 'suspended' || initialStatus === 'banned') && (
        <Button variant="secondary" size="sm" onClick={handleReactivate}>
          Riattiva
        </Button>
      )}
    </>
  );
}
