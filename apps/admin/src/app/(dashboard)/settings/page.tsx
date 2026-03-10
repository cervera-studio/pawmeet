'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

export default function SettingsPage() {
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const utils = trpc.useUtils();

  const [appName, setAppName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [photoConfidence, setPhotoConfidence] = useState(95);
  const [maxReports, setMaxReports] = useState(5);

  // Sync form state with fetched data
  useEffect(() => {
    if (settings) {
      setAppName(settings.appName);
      setSupportEmail(settings.supportEmail);
      setPhotoConfidence(settings.photoConfidenceThreshold);
      setMaxReports(settings.maxReportsBeforeSuspension);
    }
  }, [settings]);

  const updateMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      toast.success('Impostazioni salvate');
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  });

  function handleSaveGeneral() {
    updateMutation.mutate({ appName, supportEmail });
  }

  function handleSaveModeration() {
    updateMutation.mutate({
      photoConfidenceThreshold: photoConfidence,
      maxReportsBeforeSuspension: maxReports,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Impostazioni</h1>
        <p className="text-neutral-500">Configura il pannello di amministrazione</p>
      </div>

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
              <Input
                id="app-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="support-email" className="text-sm font-medium text-neutral-700">
                Email Supporto
              </label>
              <Input
                id="support-email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveGeneral}
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? 'Salvataggio...' : 'Salva modifiche'}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveModeration}
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending ? 'Salvataggio...' : 'Salva modifiche'}
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
              <Button
                variant="destructive"
                size="sm"
                onClick={() => toast.info('Funzionalita non ancora implementata')}
              >
                Svuota
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
