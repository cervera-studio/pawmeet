'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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
  const t = useTranslations('events');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const tt = useTranslations('toast');
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const officialEventFormSchema = useMemo(() => createOfficialEventFormSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOfficialEventFormValues>({
    resolver: zodResolver(officialEventFormSchema),
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
      setServerError(err instanceof Error ? err.message : tt('events.createError'));
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={organizations.length === 0}>
        {t('createOfficial.openButton')}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('createOfficial.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="official-title" className="text-sm font-medium">
                {t('createOfficial.titleLabel')}
              </label>
              <Input
                id="official-title"
                {...register('title')}
                placeholder={t('createOfficial.titlePlaceholder')}
              />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-org" className="text-sm font-medium">
                {t('createOfficial.organization')}
              </label>
              <select
                id="official-org"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                {...register('organizationId')}
              >
                <option value="">{t('createOfficial.selectOrg')}</option>
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
                {t('createOfficial.dateTime')}
              </label>
              <Input id="official-date" type="datetime-local" {...register('scheduledAt')} />
              {errors.scheduledAt && (
                <p className="text-xs text-red-600">{errors.scheduledAt.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-duration" className="text-sm font-medium">
                {t('createOfficial.duration')}
              </label>
              <Input
                id="official-duration"
                type="number"
                {...register('durationMin', { valueAsNumber: true })}
                min={15}
                max={180}
              />
              {errors.durationMin && (
                <p className="text-xs text-red-600">{errors.durationMin.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-location" className="text-sm font-medium">
                {t('createOfficial.locationLabel')}
              </label>
              <Input
                id="official-location"
                {...register('location')}
                placeholder={t('createOfficial.locationPlaceholder')}
              />
              {errors.location && <p className="text-xs text-red-600">{errors.location.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-category" className="text-sm font-medium">
                {t('createOfficial.categoryLabel')}
              </label>
              <select
                id="official-category"
                className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                {...register('category')}
              >
                <option value="walk">{t('categories.walk')}</option>
                <option value="meetup">{t('categories.meetup')}</option>
                <option value="training">{t('categories.training')}</option>
              </select>
              {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lat" className="text-sm font-medium">
                {t('createOfficial.latitude')}
              </label>
              <Input
                id="official-lat"
                type="number"
                step="any"
                {...register('latitude', { valueAsNumber: true })}
                placeholder="45.4773"
              />
              {errors.latitude && <p className="text-xs text-red-600">{errors.latitude.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-lng" className="text-sm font-medium">
                {t('createOfficial.longitude')}
              </label>
              <Input
                id="official-lng"
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
                placeholder="9.1815"
              />
              {errors.longitude && (
                <p className="text-xs text-red-600">{errors.longitude.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="official-max" className="text-sm font-medium">
                {t('createOfficial.maxParticipants')}
              </label>
              <Input
                id="official-max"
                type="number"
                {...register('maxParticipants', { valueAsNumber: true })}
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
              {t('createOfficial.descriptionLabel')}
            </label>
            <textarea
              id="official-desc"
              className="flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
              {...register('description')}
              placeholder={t('createOfficial.descriptionPlaceholder')}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('createOfficial.creating') : t('createOfficial.submit')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
