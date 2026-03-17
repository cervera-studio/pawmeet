'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { cancelGroupEvent } from '../actions';
import { EventParticipants } from './event-participants';
import { SponsorsSection } from './sponsors-section';

const categoryLabels: Record<string, string> = {
  walk: 'Passeggiata',
  meetup: 'Incontro',
  training: 'Addestramento',
};

const visibilityLabels: Record<string, string> = {
  public: 'Pubblico',
  friends_only: 'Solo amici',
  invite_only: 'Su invito',
};

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }
> = {
  scheduled: { label: 'Programmato', variant: 'success' },
  in_progress: { label: 'In corso', variant: 'warning' },
  completed: { label: 'Completato', variant: 'outline' },
  cancelled: { label: 'Annullato', variant: 'destructive' },
  template: { label: 'Template', variant: 'secondary' },
};

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
  const tt = useTranslations('toast');
  const [isCancelling, setIsCancelling] = useState(false);

  const status = statusConfig[event.status] ?? { label: event.status, variant: 'outline' as const };
  const canCancel = event.status === 'scheduled' || event.status === 'in_progress';

  async function handleCancel() {
    if (!confirm('Sei sicuro di voler annullare questo evento?')) return;
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {event.isRecurring && <Badge variant="secondary">Ricorrente</Badge>}
          </div>
          <p className="mt-1 text-neutral-500">
            Creato da{' '}
            <a href={`/users/${event.creatorId}`} className="text-primary-600 hover:underline">
              {event.creatorName ?? 'Sconosciuto'}
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/group-events')}>
            Torna alla lista
          </Button>
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Annullamento...' : 'Annulla evento'}
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{categoryLabels[event.category] ?? event.category}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Data e ora</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDateTime(event.scheduledAt)}</p>
            <p className="text-xs text-neutral-500">{event.durationMin} minuti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Partecipanti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {event.participantCount}/{event.maxParticipants}
            </p>
            {event.pendingCount > 0 && (
              <p className="text-xs text-amber-600">
                {event.pendingCount} in attesa di approvazione
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Visibilità</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {visibilityLabels[event.visibility] ?? event.visibility}
            </p>
            {event.requiresApproval && (
              <p className="text-xs text-neutral-500">Richiede approvazione</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Luogo:</span>{' '}
              <span className="font-medium">{event.location}</span>
            </div>
            <div>
              <span className="text-neutral-500">Coordinate:</span>{' '}
              <span className="font-medium">
                {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
              </span>
            </div>
            {event.description && (
              <div className="col-span-2">
                <span className="text-neutral-500">Descrizione:</span>
                <p className="mt-1 font-medium">{event.description}</p>
              </div>
            )}
            {event.recurrenceRule && (
              <div>
                <span className="text-neutral-500">Regola ricorrenza:</span>{' '}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                  {event.recurrenceRule}
                </code>
              </div>
            )}
            {event.parentEventId && (
              <div>
                <span className="text-neutral-500">Evento padre:</span>{' '}
                <a
                  href={`/group-events/${event.parentEventId}`}
                  className="text-primary-600 hover:underline"
                >
                  {event.parentEventId.slice(0, 8)}...
                </a>
              </div>
            )}
            <div>
              <span className="text-neutral-500">Creato il:</span>{' '}
              <span className="font-medium">{formatDateTime(event.createdAt)}</span>
            </div>
            <div>
              <span className="text-neutral-500">Aggiornato il:</span>{' '}
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
          <CardTitle>Sponsor</CardTitle>
        </CardHeader>
        <CardContent>
          <SponsorsSection eventId={event.id} initialSponsors={initialSponsors} />
        </CardContent>
      </Card>
    </div>
  );
}
