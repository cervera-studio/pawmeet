'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { type CreateAdminUserFormValues, createAdminUserSchema } from '@/lib/schemas/admin-user';
import { ADMIN_ROLE } from '@pawmeet/types';
import { createAdminUser } from './actions';
import { buildRoleLabels, ROLES } from './page.view-model';

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateAdminDialog({ open, onOpenChange, onCreated }: CreateAdminDialogProps) {
  const t = useTranslations('adminUsers');
  const tt = useTranslations('toast');
  const tv = useTranslations('validation');
  const roleLabels = buildRoleLabels(t);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adminUserSchema = useMemo(() => createAdminUserSchema(tv), [tv]);

  const form = useForm<CreateAdminUserFormValues>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      email: '',
      displayName: '',
      temporaryPassword: '',
      role: ADMIN_ROLE.VIEWER,
    },
  });

  async function handleCreate(data: CreateAdminUserFormValues) {
    setIsSubmitting(true);
    try {
      await createAdminUser({
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        temporaryPassword: data.temporaryPassword,
      });
      onOpenChange(false);
      form.reset();
      onCreated();
    } catch (error) {
      toast.error(handleError(error, tt('admins.createError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('createDialog.title')}
      description={t('createDialog.description')}
      isSubmitting={isSubmitting}
      onSubmit={form.handleSubmit(handleCreate)}
      submitLabel={t('createDialog.submit')}
    >
      <div className="space-y-4 py-4">
        <FormField
          label={t('createDialog.nameLabel')}
          name="create-name"
          error={form.formState.errors.displayName?.message}
        >
          <Input
            id="create-name"
            {...form.register('displayName')}
            placeholder={t('createDialog.namePlaceholder')}
          />
        </FormField>
        <FormField
          label={t('createDialog.emailLabel')}
          name="create-email"
          error={form.formState.errors.email?.message}
        >
          <Input
            id="create-email"
            type="email"
            {...form.register('email')}
            placeholder={t('createDialog.emailPlaceholder')}
          />
        </FormField>
        <FormField
          label={t('createDialog.passwordLabel')}
          name="create-password"
          error={form.formState.errors.temporaryPassword?.message}
        >
          <Input
            id="create-password"
            type="password"
            {...form.register('temporaryPassword')}
            placeholder={t('createDialog.passwordPlaceholder')}
          />
        </FormField>
        <FormField
          label={t('createDialog.roleLabel')}
          name="create-role"
          error={form.formState.errors.role?.message}
        >
          <select
            id="create-role"
            className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            {...form.register('role')}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </DialogForm>
  );
}
