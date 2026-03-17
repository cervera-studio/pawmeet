'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { removeParticipant } from '../actions';

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
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemoveParticipant(participantId: string) {
    if (!confirm('Rimuovere questo partecipante?')) return;
    setRemovingId(participantId);
    try {
      await removeParticipant(participantId, eventId);
      onParticipantRemoved();
    } catch (error) {
      toast.error(handleError(error, 'Errore durante la rimozione del partecipante'));
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
          <CardTitle>Partecipanti ({activeParticipants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeParticipants.length === 0 ? (
            <p className="text-sm text-neutral-500">Nessun partecipante</p>
          ) : (
            <div className="divide-y divide-neutral-100">
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
                        <p className="text-xs text-neutral-500">
                          con {p.dogName ?? 'cane sconosciuto'}
                          {p.isOrganizer && ' — Organizzatore'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pStatus.variant}>{pStatus.label}</Badge>
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
            <CardTitle className="text-neutral-500">
              Partecipanti passati ({inactiveParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100">
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
                      <p className="text-xs text-neutral-500">
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
    </>
  );
}
