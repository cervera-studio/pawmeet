'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  type CreateOfficialEventFormValues,
  createOfficialEventFormSchema,
} from '@/lib/schemas/create-official-event';
import { createOfficialEvent } from './actions';

interface Organization {
  id: string;
  name: string;
  type: string;
}

export function CreateOfficialEventForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOfficialEventFormValues>({
    resolver: zodResolver(createOfficialEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      scheduledAt: '',
      durationMin: 60,
      location: '',
      latitude: 0,
      longitude: 0,
      maxParticipants: 100,
      organizationId: '',
      category: 'meetup',
    },
  });

  async function onSubmit(data: CreateOfficialEventFormValues) {
    setServerError(null);
    try {
      await createOfficialEvent({
        title: data.title,
        description: data.description || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        durationMin: data.durationMin,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        maxParticipants: data.maxParticipants,
        organizationId: data.organizationId,
        category: data.category,
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Errore durante la creazione');
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="official-title" className="text-sm font-medium">
                Titolo *
              </label>
              <Input
                id="official-title"
                {...register('title')}
                placeholder="Passeggiata al Parco Sempione"
              />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-org" className="text-sm font-medium">
                Organizzazione *
              </label>
              <select
                id="official-org"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                {...register('organizationId')}
              >
                <option value="">Seleziona...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
              {errors.organizationId && (
                <p className="text-xs text-red-600">{errors.organizationId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-date" className="text-sm font-medium">
                Data e ora *
              </label>
              <Input
                id="official-date"
                type="datetime-local"
                {...register('scheduledAt')}
              />
              {errors.scheduledAt && (
                <p className="text-xs text-red-600">{errors.scheduledAt.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-duration" className="text-sm font-medium">
                Durata (minuti)
              </label>
              <Input
                id="official-duration"
                type="number"
                {...register('durationMin')}
                min={15}
                max={180}
              />
              {errors.durationMin && (
                <p className="text-xs text-red-600">{errors.durationMin.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-location" className="text-sm font-medium">
                Luogo *
              </label>
              <Input
                id="official-location"
                {...register('location')}
                placeholder="Parco Sempione, Milano"
              />
              {errors.location && (
                <p className="text-xs text-red-600">{errors.location.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-category" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="official-category"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                {...register('category')}
              >
                <option value="walk">Passeggiata</option>
                <option value="meetup">Incontro</option>
                <option value="training">Addestramento</option>
              </select>
              {errors.category && (
                <p className="text-xs text-red-600">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lat" className="text-sm font-medium">
                Latitudine *
              </label>
              <Input
                id="official-lat"
                type="number"
                step="any"
                {...register('latitude')}
                placeholder="45.4773"
              />
              {errors.latitude && (
                <p className="text-xs text-red-600">{errors.latitude.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lng" className="text-sm font-medium">
                Longitudine *
              </label>
              <Input
                id="official-lng"
                type="number"
                step="any"
                {...register('longitude')}
                placeholder="9.1815"
              />
              {errors.longitude && (
                <p className="text-xs text-red-600">{errors.longitude.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-max" className="text-sm font-medium">
                Max partecipanti
              </label>
              <Input
                id="official-max"
                type="number"
                {...register('maxParticipants')}
                min={2}
                max={500}
              />
              {errors.maxParticipants && (
                <p className="text-xs text-red-600">{errors.maxParticipants.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="official-desc" className="text-sm font-medium">
              Descrizione
            </label>
            <textarea
              id="official-desc"
              className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              {...register('description')}
              placeholder="Descrizione dell'evento..."
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creazione...' : 'Crea evento'}
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
