'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createGeneralSettingsSchema,
  createMatchingSettingsSchema,
  createModerationSettingsSchema,
  type GeneralSettingsFormValues,
  type MatchingSettingsFormValues,
  type ModerationSettingsFormValues,
} from '@/lib/schemas/settings';
import type { AppSettings } from '@/repositories';
import { clearCache, updateSettings } from './actions';

interface SettingsFormProps {
  initialSettings: AppSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const [isSaving, setIsSaving] = useState(false);
  const generalSettingsSchema = useMemo(() => createGeneralSettingsSchema(tv), [tv]);
  const moderationSettingsSchema = useMemo(() => createModerationSettingsSchema(tv), [tv]);
  const matchingSettingsSchema = useMemo(() => createMatchingSettingsSchema(tv), [tv]);

  const generalForm = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      appName: initialSettings.appName,
      supportEmail: initialSettings.supportEmail,
    },
  });

  const moderationForm = useForm<ModerationSettingsFormValues>({
    resolver: zodResolver(moderationSettingsSchema),
    defaultValues: {
      photoConfidenceThreshold: initialSettings.photoConfidenceThreshold,
      maxReportsBeforeSuspension: initialSettings.maxReportsBeforeSuspension,
    },
  });

  const matchingForm = useForm<MatchingSettingsFormValues>({
    resolver: zodResolver(matchingSettingsSchema),
    defaultValues: {
      matchWeightSize: initialSettings.matchWeightSize,
      matchWeightEnergy: initialSettings.matchWeightEnergy,
      matchWeightBehavior: initialSettings.matchWeightBehavior,
      matchWeightWalk: initialSettings.matchWeightWalk,
      matchWeightDistance: initialSettings.matchWeightDistance,
      matchWeightLeash: initialSettings.matchWeightLeash,
    },
  });

  const matchValues = matchingForm.watch();
  const matchWeightSum =
    (matchValues.matchWeightSize || 0) +
    (matchValues.matchWeightEnergy || 0) +
    (matchValues.matchWeightBehavior || 0) +
    (matchValues.matchWeightWalk || 0) +
    (matchValues.matchWeightDistance || 0) +
    (matchValues.matchWeightLeash || 0);
  const isMatchWeightValid = Math.abs(matchWeightSum - 1.0) < 0.001;

  async function handleSaveGeneral(data: GeneralSettingsFormValues) {
    setIsSaving(true);
    const result = await updateSettings(data);
    if (result.success) {
      toast.success(t('saved'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsSaving(false);
  }

  async function handleSaveModeration(data: ModerationSettingsFormValues) {
    setIsSaving(true);
    const result = await updateSettings(data);
    if (result.success) {
      toast.success(t('saved'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsSaving(false);
  }

  async function handleSaveMatching(data: MatchingSettingsFormValues) {
    setIsSaving(true);
    const result = await updateSettings(data);
    if (result.success) {
      toast.success(t('saved'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsSaving(false);
  }

  const [isClearing, setIsClearing] = useState(false);

  async function handleClearCache() {
    setIsClearing(true);
    const result = await clearCache();
    if (result.success) {
      toast.success(t('dangerZone.cacheCleared'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsClearing(false);
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('general.title')}</CardTitle>
          <CardDescription>{t('general.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={generalForm.handleSubmit(handleSaveGeneral)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="app-name" className="text-sm font-medium text-neutral-700">
                {t('general.appName')}
              </label>
              <Input id="app-name" {...generalForm.register('appName')} />
              {generalForm.formState.errors.appName && (
                <p className="text-xs text-red-600">
                  {generalForm.formState.errors.appName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="support-email" className="text-sm font-medium text-neutral-700">
                {t('general.supportEmail')}
              </label>
              <Input id="support-email" {...generalForm.register('supportEmail')} />
              {generalForm.formState.errors.supportEmail && (
                <p className="text-xs text-red-600">
                  {generalForm.formState.errors.supportEmail.message}
                </p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? tc('saving') : tc('saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('moderation.title')}</CardTitle>
          <CardDescription>{t('moderation.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={moderationForm.handleSubmit(handleSaveModeration)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="photo-confidence" className="text-sm font-medium text-neutral-700">
                {t('moderation.photoThreshold')}
              </label>
              <Input
                id="photo-confidence"
                type="number"
                {...moderationForm.register('photoConfidenceThreshold', { valueAsNumber: true })}
                min={0}
                max={100}
              />
              {moderationForm.formState.errors.photoConfidenceThreshold && (
                <p className="text-xs text-red-600">
                  {moderationForm.formState.errors.photoConfidenceThreshold.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="max-reports" className="text-sm font-medium text-neutral-700">
                {t('moderation.maxReports')}
              </label>
              <Input
                id="max-reports"
                type="number"
                {...moderationForm.register('maxReportsBeforeSuspension', { valueAsNumber: true })}
                min={1}
              />
              {moderationForm.formState.errors.maxReportsBeforeSuspension && (
                <p className="text-xs text-red-600">
                  {moderationForm.formState.errors.maxReportsBeforeSuspension.message}
                </p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? tc('saving') : tc('saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('matching.title')}</CardTitle>
          <CardDescription>{t('matching.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={matchingForm.handleSubmit(handleSaveMatching)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="match-size" className="text-sm font-medium text-neutral-700">
                {t('matching.size')}
              </label>
              <Input
                id="match-size"
                type="number"
                {...matchingForm.register('matchWeightSize', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightSize && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightSize.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="match-energy" className="text-sm font-medium text-neutral-700">
                {t('matching.energy')}
              </label>
              <Input
                id="match-energy"
                type="number"
                {...matchingForm.register('matchWeightEnergy', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightEnergy && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightEnergy.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="match-behavior" className="text-sm font-medium text-neutral-700">
                {t('matching.behavior')}
              </label>
              <Input
                id="match-behavior"
                type="number"
                {...matchingForm.register('matchWeightBehavior', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightBehavior && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightBehavior.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="match-walk" className="text-sm font-medium text-neutral-700">
                {t('matching.walk')}
              </label>
              <Input
                id="match-walk"
                type="number"
                {...matchingForm.register('matchWeightWalk', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightWalk && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightWalk.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="match-distance" className="text-sm font-medium text-neutral-700">
                {t('matching.distance')}
              </label>
              <Input
                id="match-distance"
                type="number"
                {...matchingForm.register('matchWeightDistance', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightDistance && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightDistance.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="match-leash" className="text-sm font-medium text-neutral-700">
                {t('matching.leash')}
              </label>
              <Input
                id="match-leash"
                type="number"
                {...matchingForm.register('matchWeightLeash', { valueAsNumber: true })}
                min={0}
                max={1}
                step={0.01}
              />
              {matchingForm.formState.errors.matchWeightLeash && (
                <p className="text-xs text-red-600">
                  {matchingForm.formState.errors.matchWeightLeash.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-neutral-500">
                {t('matching.sum')}:{' '}
                <span className="font-medium">{matchWeightSum.toFixed(2)}</span>
              </p>
              {!isMatchWeightValid && (
                <p className="text-sm text-red-500">{t('matching.validationError')}</p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={isSaving || !isMatchWeightValid}>
              {isSaving ? tc('saving') : tc('saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">{t('dangerZone.title')}</CardTitle>
          <CardDescription>{t('dangerZone.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">{t('dangerZone.clearCache')}</p>
              <p className="text-xs text-neutral-500">{t('dangerZone.clearCacheDesc')}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearing}
            >
              {isClearing ? tc('saving') : t('dangerZone.clearButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
