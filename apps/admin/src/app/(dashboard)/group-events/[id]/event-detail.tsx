'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';
import { cancelGroupEvent, removeParticipant } from '../actions';
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

const participantStatusConfig: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }
> = {
  pending: { label: 'In attesa', variant: 'warning' },
  accepted: { label: 'Accettato', variant: 'success' },
  declined: { label: 'Rifiutato', variant: 'outline' },
  removed: { label: 'Rimosso', variant: 'destructive' },
  cancelled: { label: 'Annullato', variant: 'secondary' },
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const status = statusConfig[event.status] ?? { label: event.status, variant: 'outline' as const };
  const canCancel = event.status === 'scheduled' || event.status === 'in_progress';

  async function handleCancel() {
    if (!confirm('Sei sicuro di voler annullare questo evento?')) return;
    setIsCancelling(true);
    try {
      await cancelGroupEvent(event.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to cancel event:', error);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    if (!confirm('Rimuovere questo partecipante?')) return;
    setRemovingId(participantId);
    try {
      await removeParticipant(participantId, event.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to remove participant:', error);
    } finally {
      setRemovingId(null);
    }
  }

  const activeParticipants = event.participants.filter(
    (p) => p.status === 'accepted' || p.status === 'pending',
  );
  const inactiveParticipants = event.participants.filter(
    (p) => p.status !== 'accepted' && p.status !== 'pending',
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {event.title}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {event.isRecurring && <Badge variant="secondary">Ricorrente</Badge>}
          </div>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
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
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{categoryLabels[event.category] ?? event.category}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Data e ora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDateTime(event.scheduledAt)}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {event.durationMin} minuti
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Partecipanti
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Visibilità
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {visibilityLabels[event.visibility] ?? event.visibility}
            </p>
            {event.requiresApproval && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Richiede approvazione
              </p>
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
              <span className="text-neutral-500 dark:text-neutral-400">Luogo:</span>{' '}
              <span className="font-medium">{event.location}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Coordinate:</span>{' '}
              <span className="font-medium">
                {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
              </span>
            </div>
            {event.description && (
              <div className="col-span-2">
                <span className="text-neutral-500 dark:text-neutral-400">Descrizione:</span>
                <p className="mt-1 font-medium">{event.description}</p>
              </div>
            )}
            {event.recurrenceRule && (
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Regola ricorrenza:</span>{' '}
                <code className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-xs">
                  {event.recurrenceRule}
                </code>
              </div>
            )}
            {event.parentEventId && (
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">Evento padre:</span>{' '}
                <a
                  href={`/group-events/${event.parentEventId}`}
                  className="text-primary-600 hover:underline"
                >
                  {event.parentEventId.slice(0, 8)}...
                </a>
              </div>
            )}
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Creato il:</span>{' '}
              <span className="font-medium">{formatDateTime(event.createdAt)}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Aggiornato il:</span>{' '}
              <span className="font-medium">{formatDateTime(event.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Partecipanti ({activeParticipants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeParticipants.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nessun partecipante</p>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {activeParticipants.map((p) => {
                const pStatus = participantStatusConfig[p.status] ?? {
                  label: p.status,
                  variant: 'outline' as const,
                };
                return (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={`/users/${p.userId}`}
                          className="text-sm font-medium text-primary-600 hover:underline"
                        >
                          {p.userName ?? 'Sconosciuto'}
                        </a>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          con {p.dogName ?? 'cane sconosciuto'}
                          {p.isOrganizer && ' — Organizzatore'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pStatus.variant}>{pStatus.label}</Badge>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {p.joinedAt ? formatDateTime(p.joinedAt) : '-'}
                      </span>
                      {!p.isOrganizer && (p.status === 'accepted' || p.status === 'pending') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(p.id)}
                          disabled={removingId === p.id}
                        >
                          Rimuovi
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
            <CardTitle className="text-neutral-500 dark:text-neutral-400">
              Partecipanti passati ({inactiveParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {inactiveParticipants.map((p) => {
                const pStatus = participantStatusConfig[p.status] ?? {
                  label: p.status,
                  variant: 'outline' as const,
                };
                return (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <a
                        href={`/users/${p.userId}`}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {p.userName ?? 'Sconosciuto'}
                      </a>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        con {p.dogName ?? 'cane sconosciuto'}
                      </p>
                    </div>
                    <Badge variant={pStatus.variant}>{pStatus.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
