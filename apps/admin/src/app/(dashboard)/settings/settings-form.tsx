'use client';

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
  const [isSaving, setIsSaving] = useState(false);
  const [appName, setAppName] = useState(initialSettings.appName);
  const [supportEmail, setSupportEmail] = useState(initialSettings.supportEmail);
  const [photoConfidence, setPhotoConfidence] = useState(initialSettings.photoConfidenceThreshold);
  const [maxReports, setMaxReports] = useState(initialSettings.maxReportsBeforeSuspension);

  async function handleSaveGeneral() {
    setIsSaving(true);
    const result = await updateSettings({ appName, supportEmail });
    if (result.success) {
      toast.success('Impostazioni salvate');
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio');
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
      toast.success('Impostazioni salvate');
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio');
    }
    setIsSaving(false);
  }

  function handleClearCache() {
    toast.info('Funzionalita non ancora implementata');
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impostazioni Generali</CardTitle>
          <CardDescription>Configura le impostazioni di base della piattaforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="app-name" className="text-sm font-medium text-neutral-700">
              Nome App
            </label>
            <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-email" className="text-sm font-medium text-neutral-700">
              Email Supporto
            </label>
            <Input
              id="support-email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleSaveGeneral} disabled={isSaving}>
            {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
        </CardContent>
      </Card>

      {/* Moderation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moderazione</CardTitle>
          <CardDescription>Configura le regole di moderazione automatica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="photo-confidence" className="text-sm font-medium text-neutral-700">
              Soglia auto-approvazione foto (confidence %)
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
              Max segnalazioni prima di sospensione
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
            {isSaving ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600">Zona Pericolosa</CardTitle>
          <CardDescription>Azioni irreversibili</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900">Svuota cache</p>
              <p className="text-xs text-neutral-500">Invalida tutta la cache del sistema</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClearCache}>
              Svuota
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
