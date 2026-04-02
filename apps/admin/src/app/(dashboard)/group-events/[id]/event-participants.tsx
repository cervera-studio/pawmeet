'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { removeParticipant } from '../actions';

const participantStatusVariants: Record<
  string,
  'success' | 'warning' | 'destructive' | 'outline' | 'secondary'
> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'outline',
  removed: 'destructive',
  cancelled: 'secondary',
};

interface Participant {
  id: string;
  userId: string;
  userName: string | null;
  dogId: string | null;
  dogName: string | null;
  status: string;
  isOrganizer: boolean;
  joinedAt: string | Date | null;
}

interface EventParticipantsProps {
  eventId: string;
  participants: Participant[];
  onParticipantRemoved: () => void;
}

export function EventParticipants({
  eventId,
  participants,
  onParticipantRemoved,
}: EventParticipantsProps) {
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const tt = useTranslations('toast');
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemoveParticipant(participantId: string) {
    if (!confirm(t('participants.confirmRemove'))) return;
    setRemovingId(participantId);
    try {
      await removeParticipant(participantId, eventId);
      onParticipantRemoved();
    } catch (error) {
      toast.error(handleError(error, tt('events.participantRemoveError')));
    } finally {
      setRemovingId(null);
    }
  }

  const activeParticipants = participants.filter(
    (p) => p.status === 'accepted' || p.status === 'pending',
  );
  const inactiveParticipants = participants.filter(
    (p) => p.status !== 'accepted' && p.status !== 'pending',
  );

  return (
    <>
      {/* Active participants */}
      <Card>
        <CardHeader>
          <CardTitle>{t('participants.title', { count: activeParticipants.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeParticipants.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('participants.none')}</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {activeParticipants.map((p) => {
                const pVariant = participantStatusVariants[p.status] ?? ('outline' as const);
                const pLabel =
                  t(`participants.statuses.${p.status}` as Parameters<typeof t>[0]) ?? p.status;
                return (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={`/users/${p.userId}`}
                          className="text-sm font-medium text-primary-600 hover:underline"
                        >
                          {p.userName ?? tc('unknown')}
                        </a>
                        <p className="text-xs text-neutral-500">
                          {t('participants.with')} {p.dogName ?? t('participants.unknownDog')}
                          {p.isOrganizer && ` — ${t('participants.organizer')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pVariant}>{pLabel}</Badge>
                      <span className="text-xs text-neutral-500">
                        {p.joinedAt ? formatDateTime(p.joinedAt) : '-'}
                      </span>
                      {!p.isOrganizer && (p.status === 'accepted' || p.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(p.id)}
                          disabled={removingId === p.id}
                        >
                          {t('participants.remove')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive participants */}
      {inactiveParticipants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-neutral-500">
              {t('participants.pastTitle', { count: inactiveParticipants.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100">
              {inactiveParticipants.map((p) => {
                const pVariant = participantStatusVariants[p.status] ?? ('outline' as const);
                const pLabel =
                  t(`participants.statuses.${p.status}` as Parameters<typeof t>[0]) ?? p.status;
                return (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <a
                        href={`/users/${p.userId}`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {p.userName ?? tc('unknown')}
                      </a>
                      <p className="text-xs text-neutral-500">
                        {t('participants.with')} {p.dogName ?? t('participants.unknownDog')}
                      </p>
                    </div>
                    <Badge variant={pVariant}>{pLabel}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
