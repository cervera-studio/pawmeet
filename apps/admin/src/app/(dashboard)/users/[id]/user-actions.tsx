'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermission } from '@/hooks/use-permission';
import { banUser, reactivateUser, requestGdprExport, suspendUser } from '../actions';

type UserStatus = 'active' | 'suspended' | 'banned';

interface UserActionsProps {
  userId: string;
  initialStatus: UserStatus;
}

export function UserActions({ userId, initialStatus }: UserActionsProps) {
  const { isAdmin } = usePermission();
  const t = useTranslations('users.detail');
  const tt = useTranslations('toast');
  const tc = useTranslations('common');
  const [gdprDialogOpen, setGdprDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  async function handleGdprExport() {
    setIsExporting(true);
    try {
      const result = await requestGdprExport(userId);
      if (result.success) {
        toast.success(tt('users.gdprExportSuccess'));
      } else {
        toast.error(result.error ?? tt('users.gdprExportError'));
      }
    } finally {
      setIsExporting(false);
      setGdprDialogOpen(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setGdprDialogOpen(true)}>
        {t('exportData')}
      </Button>
      {initialStatus === 'active' && (
        <>
          <Button variant="outline" size="sm" onClick={handleSuspend}>
            {t('suspend')}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBan}>
            {t('ban')}
          </Button>
        </>
      )}
      {(initialStatus === 'suspended' || initialStatus === 'banned') && (
        <Button variant="secondary" size="sm" onClick={handleReactivate}>
          {t('reactivate')}
        </Button>
      )}

      <Dialog open={gdprDialogOpen} onOpenChange={setGdprDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('gdprExportDialog.title')}</DialogTitle>
            <DialogDescription>{t('gdprExportDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGdprDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleGdprExport} disabled={isExporting}>
              {isExporting ? t('gdprExportDialog.exporting') : t('gdprExportDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
