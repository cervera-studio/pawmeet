'use client';

import { ADMIN_ROLE, type AdminRole } from '@pawmeet/types';
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
import { handleError } from '@/lib/error-handler';
import { updateAdminRole } from './actions';
import { type AdminUser, buildRoleLabels, ROLES, toRole } from './page.view-model';

interface EditRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onUpdated: () => void;
}

export function EditRoleDialog({ open, onOpenChange, user, onUpdated }: EditRoleDialogProps) {
  const t = useTranslations('adminUsers');
  const tc = useTranslations('common');
  const tt = useTranslations('toast');
  const [editRole, setEditRole] = useState<AdminRole>(ADMIN_ROLE.VIEWER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && user) {
      setEditRole(toRole(user.role));
    }
    onOpenChange(nextOpen);
  }

  async function handleUpdateRole() {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateAdminRole({ adminId: user.id, newRole: editRole });
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast.error(handleError(error, tt('admins.roleUpdateError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  const roleLabels = buildRoleLabels(t);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editRoleDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('editRoleDialog.description', { name: user?.displayName ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="edit-role">
              {t('editRoleDialog.roleLabel')}
            </label>
            <select
              id="edit-role"
              className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
              value={editRole}
              onChange={(e) => setEditRole(toRole(e.target.value))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleUpdateRole} disabled={isSubmitting}>
            {isSubmitting ? tc('saving') : tc('saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
