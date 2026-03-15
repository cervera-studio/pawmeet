'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createOfficialEvent } from './actions';

interface Organization {
  id: string;
  name: string;
  type: string;
}

export function CreateOfficialEventForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [organizationId, setOrganizationId] = useState('');
  const [category, setCategory] = useState<'walk' | 'meetup' | 'training'>('meetup');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !scheduledAt || !location || !latitude || !longitude || !organizationId) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createOfficialEvent({
        title,
        description: description || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMin,
        location,
        latitude: Number(latitude),
        longitude: Number(longitude),
        maxParticipants,
        organizationId,
        category,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={organizations.length === 0}>
        Crea Main Event
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nuovo Main Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="official-title" className="text-sm font-medium">
                Titolo *
              </label>
              <Input
                id="official-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Passeggiata al Parco Sempione"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-org" className="text-sm font-medium">
                Organizzazione *
              </label>
              <select
                id="official-org"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
              >
                <option value="">Seleziona...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-date" className="text-sm font-medium">
                Data e ora *
              </label>
              <Input
                id="official-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-duration" className="text-sm font-medium">
                Durata (minuti)
              </label>
              <Input
                id="official-duration"
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                min={15}
                max={180}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-location" className="text-sm font-medium">
                Luogo *
              </label>
              <Input
                id="official-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Parco Sempione, Milano"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-category" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="official-category"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                <option value="walk">Passeggiata</option>
                <option value="meetup">Incontro</option>
                <option value="training">Addestramento</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lat" className="text-sm font-medium">
                Latitudine *
              </label>
              <Input
                id="official-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="45.4773"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lng" className="text-sm font-medium">
                Longitudine *
              </label>
              <Input
                id="official-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="9.1815"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-max" className="text-sm font-medium">
                Max partecipanti
              </label>
              <Input
                id="official-max"
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                min={2}
                max={500}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="official-desc" className="text-sm font-medium">
              Descrizione
            </label>
            <textarea
              id="official-desc"
              className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione dell'evento..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea evento'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
