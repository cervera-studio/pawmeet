'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AppSettings } from '@/repositories';
import { updateSettings } from './actions';

interface SettingsFormProps {
  initialSettings: AppSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [isSaving, setIsSaving] = useState(false);
  const [appName, setAppName] = useState(initialSettings.appName);
  const [supportEmail, setSupportEmail] = useState(initialSettings.supportEmail);
  const [photoConfidence, setPhotoConfidence] = useState(initialSettings.photoConfidenceThreshold);
  const [maxReports, setMaxReports] = useState(initialSettings.maxReportsBeforeSuspension);

  async function handleSaveGeneral() {
    setIsSaving(true);
    const result = await updateSettings({ appName, supportEmail });
    if (result.success) {
      toast.success(t('saved'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsSaving(false);
  }

  async function handleSaveModeration() {
    setIsSaving(true);
    const result = await updateSettings({
      photoConfidenceThreshold: photoConfidence,
      maxReportsBeforeSuspension: maxReports,
    });
    if (result.success) {
      toast.success(t('saved'));
    } else {
      toast.error(result.error ?? t('saveError'));
    }
    setIsSaving(false);
  }

  function handleClearCache() {
    toast.info(t('notImplemented'));
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('general.title')}</CardTitle>
          <CardDescription>{t('general.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="app-name" className="text-sm font-medium text-neutral-700">
              {t('general.appName')}
            </label>
            <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-email" className="text-sm font-medium text-neutral-700">
              {t('general.supportEmail')}
            </label>
            <Input
              id="support-email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleSaveGeneral} disabled={isSaving}>
            {isSaving ? tc('saving') : tc('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('moderation.title')}</CardTitle>
          <CardDescription>{t('moderation.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="photo-confidence" className="text-sm font-medium text-neutral-700">
              {t('moderation.photoThreshold')}
            </label>
            <Input
              id="photo-confidence"
              type="number"
              value={photoConfidence}
              onChange={(e) => setPhotoConfidence(Number(e.target.value))}
              min={0}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="max-reports" className="text-sm font-medium text-neutral-700">
              {t('moderation.maxReports')}
            </label>
            <Input
              id="max-reports"
              type="number"
              value={maxReports}
              onChange={(e) => setMaxReports(Number(e.target.value))}
              min={1}
            />
          </div>
          <Button size="sm" onClick={handleSaveModeration} disabled={isSaving}>
            {isSaving ? tc('saving') : tc('saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
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
            <Button variant="destructive" size="sm" onClick={handleClearCache}>
              {t('dangerZone.clearButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
