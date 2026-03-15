'use client';

import type { FormEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DialogFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  isSubmitting: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  submitLabel?: string;
  submitVariant?: 'default' | 'destructive';
}

export function DialogForm({
  open,
  onClose,
  title,
  description,
  isSubmitting,
  onSubmit,
  children,
  submitLabel,
  submitVariant = 'default',
}: DialogFormProps) {
  const tc = useTranslations('common');
  const resolvedSubmitLabel = submitLabel ?? tc('save');

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit}>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" variant={submitVariant} disabled={isSubmitting}>
              {isSubmitting ? tc('saving') : resolvedSubmitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
