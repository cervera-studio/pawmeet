'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermission } from '@/hooks/use-permission';
import { formatDateTime } from '@/lib/formatters';
import { revokeAllUserSessions, revokeUserSession } from '../actions';

interface Session {
  id: string;
  deviceName: string | null;
  deviceOs: string | null;
  createdAt: string | Date;
}

interface UserSessionsProps {
  userId: string;
  sessions: Session[];
}

export function UserSessions({ userId, sessions }: UserSessionsProps) {
  const { isAdmin } = usePermission();
  const t = useTranslations('users.detail');
  const tt = useTranslations('toast');
  const tc = useTranslations('common');
  const router = useRouter();
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId);
    try {
      const result = await revokeUserSession(userId, sessionId);
      if (result.success) {
        toast.success(tt('users.sessionRevoked'));
        router.refresh();
      } else {
        toast.error(result.error ?? tt('users.revokeSessionError'));
      }
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAll() {
    setRevoking('all');
    try {
      const result = await revokeAllUserSessions(userId);
      if (result.success) {
        toast.success(tt('users.allSessionsRevoked'));
        router.refresh();
      } else {
        toast.error(result.error ?? tt('users.revokeAllSessionsError'));
      }
    } finally {
      setRevoking(null);
      setRevokeAllOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {t('sessionsCount', { count: sessions.length })}
        </CardTitle>
        {isAdmin && sessions.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            disabled={revoking !== null}
            onClick={() => setRevokeAllOpen(true)}
          >
            {t('revokeAllSessions')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noSessions')}</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {session.deviceName ?? t('unknownDevice')}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {session.deviceOs ?? '-'} · {formatDateTime(session.createdAt)}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revoking !== null}
                    onClick={() => handleRevoke(session.id)}
                  >
                    {revoking === session.id ? tc('loading') : t('revokeSession')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('revokeAllDialog.title')}</DialogTitle>
            <DialogDescription>{t('revokeAllDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAllOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRevokeAll} disabled={revoking === 'all'}>
              {revoking === 'all' ? tc('loading') : t('revokeAllDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
