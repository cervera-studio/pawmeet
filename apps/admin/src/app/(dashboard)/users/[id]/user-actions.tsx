'use client';

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

  if (!isAdmin) {
    return null;
  }

  async function handleSuspend() {
    const result = await suspendUser(userId);
    if (result.success) {
      toast.success('Utente sospeso');
    } else {
      toast.error(result.error ?? 'Errore durante la sospensione');
    }
  }

  async function handleBan() {
    const result = await banUser(userId);
    if (result.success) {
      toast.success('Utente bannato');
    } else {
      toast.error(result.error ?? 'Errore durante il ban');
    }
  }

  async function handleReactivate() {
    const result = await reactivateUser(userId);
    if (result.success) {
      toast.success('Utente riattivato');
    } else {
      toast.error(result.error ?? 'Errore durante la riattivazione');
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
