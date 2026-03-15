'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { sendBroadcast, sendTargeted } from './actions';

interface NotificationFormProps {
  usersWithToken: number;
}

export function NotificationForm({ usersWithToken }: NotificationFormProps) {
  const t = useTranslations('notifications');
  const [activeTab, setActiveTab] = useState<'broadcast' | 'targeted'>('broadcast');

  return (
    <div className="space-y-6">
      {/* Tab buttons */}
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
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ sentCount: number } | null>(null);

  const isValid = title.trim().length > 0 && body.trim().length > 0;

  async function handleSend() {
    setConfirmOpen(false);
    setIsSending(true);
    setResult(null);
    try {
      const res = await sendBroadcast({ title: title.trim(), body: body.trim() });
      setResult({ sentCount: res.sentCount });
      toast.success(t('broadcast.successMessage', { count: res.sentCount }));
      setTitle('');
      setBody('');
    } catch {
      toast.error('Error sending broadcast notification');
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
          <label
            htmlFor="broadcast-title"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('broadcast.titleLabel')}
          </label>
          <Input
            id="broadcast-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('broadcast.titlePlaceholder')}
            maxLength={100}
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{title.length}/100</p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="broadcast-body"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('broadcast.bodyLabel')}
          </label>
          <textarea
            id="broadcast-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('broadcast.bodyPlaceholder')}
            maxLength={500}
            rows={4}
            className="flex w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{body.length}/500</p>
        </div>

        {result && (
          <p className="text-sm text-green-600 font-medium">
            {t('broadcast.successMessage', { count: result.sentCount })}
          </p>
        )}

        <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={isSending || !isValid}>
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
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [userIdsText, setUserIdsText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sentCount: number; skippedCount: number } | null>(null);

  function parseUserIds(): string[] {
    return userIdsText
      .split(/[,\n]/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  const userIds = parseUserIds();
  const isValid = title.trim().length > 0 && body.trim().length > 0 && userIds.length > 0;

  async function handleSend() {
    setIsSending(true);
    setResult(null);
    try {
      const res = await sendTargeted({
        title: title.trim(),
        body: body.trim(),
        userIds,
      });
      setResult({ sentCount: res.sentCount, skippedCount: res.skippedCount });
      toast.success(
        t('targeted.successMessage', {
          sentCount: res.sentCount,
          skippedCount: res.skippedCount,
        }),
      );
      setTitle('');
      setBody('');
      setUserIdsText('');
    } catch {
      toast.error('Error sending targeted notification');
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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="targeted-title"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('broadcast.titleLabel')}
          </label>
          <Input
            id="targeted-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('broadcast.titlePlaceholder')}
            maxLength={100}
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{title.length}/100</p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="targeted-body"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('broadcast.bodyLabel')}
          </label>
          <textarea
            id="targeted-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('broadcast.bodyPlaceholder')}
            maxLength={500}
            rows={4}
            className="flex w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{body.length}/500</p>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="targeted-user-ids"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('targeted.userIdsLabel')}
          </label>
          <textarea
            id="targeted-user-ids"
            value={userIdsText}
            onChange={(e) => setUserIdsText(e.target.value)}
            placeholder={t('targeted.userIdsPlaceholder')}
            rows={4}
            className="flex w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm font-mono shadow-sm transition-colors placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {userIds.length > 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {userIds.length} {userIds.length === 1 ? 'user' : 'users'}
            </p>
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

        <Button size="sm" onClick={handleSend} disabled={isSending || !isValid}>
          {isSending ? '...' : t('targeted.sendButton')}
        </Button>
      </CardContent>
    </Card>
  );
}
