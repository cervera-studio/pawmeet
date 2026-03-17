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
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { resetAdminPassword } from './actions';
import type { AdminUser } from './page.view-model';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onReset: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
  onReset,
}: ResetPasswordDialogProps) {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('common');
  const tt = useTranslations('toast');
  const [resetPwd, setResetPwd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setResetPwd('');
    }
    onOpenChange(nextOpen);
  }

  async function handleResetPassword() {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await resetAdminPassword({ adminId: user.id, newPassword: resetPwd });
      onOpenChange(false);
      setResetPwd('');
      onReset();
    } catch (error) {
      toast.error(handleError(error, tt('admins.passwordResetError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('resetPasswordDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('resetPasswordDialog.description', { name: user?.displayName ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reset-password">
              {t('resetPasswordDialog.passwordLabel')}
            </label>
            <Input
              id="reset-password"
              type="password"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder={t('resetPasswordDialog.passwordPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleResetPassword}
            disabled={isSubmitting || !resetPwd}
          >
            {isSubmitting ? tc('saving') : t('resetPasswordDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
