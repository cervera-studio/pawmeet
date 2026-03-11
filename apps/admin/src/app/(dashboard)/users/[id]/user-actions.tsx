'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { userRepository } from '@/repositories';

type UserStatus = 'active' | 'suspended' | 'banned';

interface UserActionsProps {
  userId: string;
  initialStatus: UserStatus;
}

export function UserActions({ userId, initialStatus }: UserActionsProps) {
  const { isAdmin } = usePermission();
  const router = useRouter();

  if (!isAdmin) {
    return null;
  }

  async function handleSuspend() {
    try {
      await userRepository.suspend(userId);
      toast.success('Utente sospeso');
      router.refresh();
    } catch {
      toast.error('Errore durante la sospensione');
    }
  }

  async function handleBan() {
    try {
      await userRepository.ban(userId);
      toast.success('Utente bannato');
      router.refresh();
    } catch {
      toast.error('Errore durante il ban');
    }
  }

  async function handleReactivate() {
    try {
      await userRepository.reactivate(userId);
      toast.success('Utente riattivato');
      router.refresh();
    } catch {
      toast.error('Errore durante la riattivazione');
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
