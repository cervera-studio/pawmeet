'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  type BroadcastNotificationFormValues,
  createBroadcastNotificationSchema,
  createTargetedNotificationSchema,
  type TargetedNotificationFormValues,
} from '@/lib/schemas/notification';
import { sendBroadcast, sendTargeted } from './actions';

interface NotificationFormProps {
  usersWithToken: number;
}

export function NotificationForm({ usersWithToken }: NotificationFormProps) {
  const t = useTranslations('notifications');
  const [activeTab, setActiveTab] = useState<'broadcast' | 'targeted'>('broadcast');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'broadcast'
              ? 'border-primary-800 text-primary-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('broadcast')}
        >
          {t('broadcast.broadcastTitle')}
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'targeted'
              ? 'border-primary-800 text-primary-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => setActiveTab('targeted')}
        >
          {t('targeted.targetedTitle')}
        </button>
      </div>

      {activeTab === 'broadcast' ? (
        <BroadcastForm usersWithToken={usersWithToken} />
      ) : (
        <TargetedForm />
      )}
    </div>
  );
}

function BroadcastForm({ usersWithToken }: { usersWithToken: number }) {
  const t = useTranslations('notifications');
  const tv = useTranslations('validation');
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ sentCount: number } | null>(null);
  const broadcastNotificationSchema = useMemo(() => createBroadcastNotificationSchema(tv), [tv]);

  const form = useForm<BroadcastNotificationFormValues>({
    resolver: zodResolver(broadcastNotificationSchema),
    defaultValues: { title: '', body: '' },
  });

  const titleValue = form.watch('title');
  const bodyValue = form.watch('body');

  function handleOpenConfirm() {
    form.handleSubmit(() => setConfirmOpen(true))();
  }

  async function handleSend() {
    setConfirmOpen(false);
    setIsSending(true);
    setResult(null);
    try {
      const data = form.getValues();
      const res = await sendBroadcast({ title: data.title.trim(), body: data.body.trim() });
      setResult({ sentCount: res.sentCount });
      toast.success(t('broadcast.successMessage', { count: res.sentCount }));
      form.reset();
    } catch (error) {
      toast.error(handleError(error, t('broadcast.sendError')));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('broadcast.broadcastTitle')}</CardTitle>
        <CardDescription>{t('broadcast.broadcastDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="broadcast-title" className="text-sm font-medium text-neutral-700">
            {t('broadcast.titleLabel')}
          </label>
          <Input
            id="broadcast-title"
            {...form.register('title')}
            placeholder={t('broadcast.titlePlaceholder')}
            maxLength={100}
          />
          {form.formState.errors.title ? (
            <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
          ) : (
            <p className="text-xs text-neutral-500">{titleValue.length}/100</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="broadcast-body" className="text-sm font-medium text-neutral-700">
            {t('broadcast.bodyLabel')}
          </label>
          <textarea
            id="broadcast-body"
            {...form.register('body')}
            placeholder={t('broadcast.bodyPlaceholder')}
            maxLength={500}
            rows={4}
            className="flex w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {form.formState.errors.body ? (
            <p className="text-xs text-red-600">{form.formState.errors.body.message}</p>
          ) : (
            <p className="text-xs text-neutral-500">{bodyValue.length}/500</p>
          )}
        </div>

        {result && (
          <p className="text-sm text-green-600 font-medium">
            {t('broadcast.successMessage', { count: result.sentCount })}
          </p>
        )}

        <Button size="sm" onClick={handleOpenConfirm} disabled={isSending}>
          {isSending ? '...' : t('broadcast.sendButton')}
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('broadcast.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('broadcast.confirmDescription', { count: usersWithToken })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSend}>{t('broadcast.sendButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TargetedForm() {
  const t = useTranslations('notifications');
  const tv = useTranslations('validation');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sentCount: number; skippedCount: number } | null>(null);
  const targetedNotificationSchema = useMemo(() => createTargetedNotificationSchema(tv), [tv]);

  const form = useForm<TargetedNotificationFormValues>({
    resolver: zodResolver(targetedNotificationSchema),
    defaultValues: { title: '', body: '', userIdsText: '' },
  });

  const titleValue = form.watch('title');
  const bodyValue = form.watch('body');
  const userIdsText = form.watch('userIdsText');

  function parseUserIds(text: string): string[] {
    return text
      .split(/[,\n]/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  const userIds = parseUserIds(userIdsText);

  async function handleSend(data: TargetedNotificationFormValues) {
    setIsSending(true);
    setResult(null);
    const ids = parseUserIds(data.userIdsText);
    try {
      const res = await sendTargeted({
        title: data.title.trim(),
        body: data.body.trim(),
        userIds: ids,
      });
      setResult({ sentCount: res.sentCount, skippedCount: res.skippedCount });
      toast.success(
        t('targeted.successMessage', {
          sentCount: res.sentCount,
          skippedCount: res.skippedCount,
        }),
      );
      form.reset();
    } catch (error) {
      toast.error(handleError(error, t('targeted.sendError')));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('targeted.targetedTitle')}</CardTitle>
        <CardDescription>{t('targeted.targetedDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSend)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="targeted-title" className="text-sm font-medium text-neutral-700">
              {t('broadcast.titleLabel')}
            </label>
            <Input
              id="targeted-title"
              {...form.register('title')}
              placeholder={t('broadcast.titlePlaceholder')}
              maxLength={100}
            />
            {form.formState.errors.title ? (
              <p className="text-xs text-red-600">{form.formState.errors.title.message}</p>
            ) : (
              <p className="text-xs text-neutral-500">{titleValue.length}/100</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="targeted-body" className="text-sm font-medium text-neutral-700">
              {t('broadcast.bodyLabel')}
            </label>
            <textarea
              id="targeted-body"
              {...form.register('body')}
              placeholder={t('broadcast.bodyPlaceholder')}
              maxLength={500}
              rows={4}
              className="flex w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {form.formState.errors.body ? (
              <p className="text-xs text-red-600">{form.formState.errors.body.message}</p>
            ) : (
              <p className="text-xs text-neutral-500">{bodyValue.length}/500</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="targeted-user-ids" className="text-sm font-medium text-neutral-700">
              {t('targeted.userIdsLabel')}
            </label>
            <textarea
              id="targeted-user-ids"
              {...form.register('userIdsText')}
              placeholder={t('targeted.userIdsPlaceholder')}
              rows={4}
              className="flex w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm font-mono shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {form.formState.errors.userIdsText ? (
              <p className="text-xs text-red-600">{form.formState.errors.userIdsText.message}</p>
            ) : (
              userIds.length > 0 && (
                <p className="text-xs text-neutral-500">
                  {userIds.length} {userIds.length === 1 ? 'utente' : 'utenti'}
                </p>
              )
            )}
          </div>

          {result && (
            <p className="text-sm text-green-600 font-medium">
              {t('targeted.successMessage', {
                sentCount: result.sentCount,
                skippedCount: result.skippedCount,
              })}
            </p>
          )}

          <Button type="submit" size="sm" disabled={isSending}>
            {isSending ? '...' : t('targeted.sendButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
