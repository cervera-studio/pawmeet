'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { GROUP_EVENT_STATUS } from '@pawmeet/types';
import { cancelGroupEvent } from '../actions';
import { EventParticipants } from './event-participants';
import { SponsorsSection } from './sponsors-section';

interface EventSponsorData {
  id: string;
  eventId: string;
  organizationId: string;
  tier: string;
  logoPlacement: string;
  createdAt: string;
  organizationName: string;
  organizationLogoUrl: string | null;
}

interface EventDetailProps {
  initialSponsors: EventSponsorData[];
  event: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    visibility: string;
    status: string;
    scheduledAt: string | Date;
    durationMin: number | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    maxParticipants: number | null;
    requiresApproval: boolean;
    recurrenceRule: string | null;
    recurrenceEnd: string | Date | null;
    parentEventId: string | null;
    coverImageUrl: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    creatorId: string;
    creatorName: string | null;
    participantCount: number;
    pendingCount: number;
    isRecurring: boolean;
    participants: {
      id: string;
      userId: string;
      userName: string | null;
      dogId: string | null;
      dogName: string | null;
      status: string;
      isOrganizer: boolean;
      joinedAt: string | Date | null;
    }[];
  };
}

export function EventDetail({ event, initialSponsors }: EventDetailProps) {
  const router = useRouter();
  const t = useTranslations('events');
  const tt = useTranslations('toast');
  const tc = useTranslations('common');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const statusVariants: Record<
    string,
    'success' | 'warning' | 'destructive' | 'outline' | 'secondary'
  > = {
    scheduled: 'success',
    in_progress: 'warning',
    completed: 'outline',
    cancelled: 'destructive',
    template: 'secondary',
  };

  const status = {
    label: t(`statuses.${event.status}` as Parameters<typeof t>[0]) ?? event.status,
    variant: statusVariants[event.status] ?? ('outline' as const),
  };
  const canCancel =
    event.status === GROUP_EVENT_STATUS.SCHEDULED ||
    event.status === GROUP_EVENT_STATUS.IN_PROGRESS;

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await cancelGroupEvent(event.id);
      router.refresh();
    } catch (error) {
      toast.error(handleError(error, tt('events.cancelError')));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title={t('detail.confirmCancel')}
        confirmLabel={t('detail.cancelEvent')}
        cancelLabel={tc('cancel')}
        variant="destructive"
        isLoading={isCancelling}
        onConfirm={() => void handleCancel()}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {event.isRecurring && <Badge variant="secondary">{t('detail.recurring')}</Badge>}
          </div>
          <p className="mt-1 text-neutral-500">
            {t('detail.createdBy')}{' '}
            <a href={`/users/${event.creatorId}`} className="text-primary-600 hover:underline">
              {event.creatorName ?? tc('unknown')}
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/group-events')}>
            {t('detail.backToList')}
          </Button>
          {canCancel && (
            <Button
              variant="destructive"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
            >
              {isCancelling ? t('detail.cancelling') : t('detail.cancelEvent')}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              {t('detail.category')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">
              {t(`categories.${event.category}` as Parameters<typeof t>[0]) ?? event.category}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              {t('detail.dateTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDateTime(event.scheduledAt)}</p>
            <p className="text-xs text-neutral-500">
              {event.durationMin} {t('detail.minutes')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              {t('detail.participants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {event.participantCount}/{event.maxParticipants}
            </p>
            {event.pendingCount > 0 && (
              <p className="text-xs text-amber-600">
                {t('detail.pendingApproval', { count: event.pendingCount })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              {t('detail.visibility')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {t(`visibility.${event.visibility}` as Parameters<typeof t>[0]) ?? event.visibility}
            </p>
            {event.requiresApproval && (
              <p className="text-xs text-neutral-500">{t('detail.requiresApproval')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">{t('detail.location')}:</span>{' '}
              <span className="font-medium">{event.location}</span>
            </div>
            <div>
              <span className="text-neutral-500">{t('detail.coordinates')}:</span>{' '}
              <span className="font-medium">
                {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
              </span>
            </div>
            {event.description && (
              <div className="col-span-2">
                <span className="text-neutral-500">{t('detail.description')}:</span>
                <p className="mt-1 font-medium">{event.description}</p>
              </div>
            )}
            {event.recurrenceRule && (
              <div>
                <span className="text-neutral-500">{t('detail.recurrenceRule')}:</span>{' '}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                  {event.recurrenceRule}
                </code>
              </div>
            )}
            {event.parentEventId && (
              <div>
                <span className="text-neutral-500">{t('detail.parentEvent')}:</span>{' '}
                <a
                  href={`/group-events/${event.parentEventId}`}
                  className="text-primary-600 hover:underline"
                >
                  {event.parentEventId.slice(0, 8)}...
                </a>
              </div>
            )}
            <div>
              <span className="text-neutral-500">{t('detail.createdAt')}:</span>{' '}
              <span className="font-medium">{formatDateTime(event.createdAt)}</span>
            </div>
            <div>
              <span className="text-neutral-500">{t('detail.updatedAt')}:</span>{' '}
              <span className="font-medium">{formatDateTime(event.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <EventParticipants
        eventId={event.id}
        participants={event.participants}
        onParticipantRemoved={() => router.refresh()}
      />

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.sponsors')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SponsorsSection eventId={event.id} initialSponsors={initialSponsors} />
        </CardContent>
      </Card>
    </div>
  );
}
