'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSettingsViewModel } from './page.view-model';

export default function SettingsPage() {
  const vm = useSettingsViewModel();

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
                value={vm.appName}
                onChange={(e) => vm.setAppName(e.target.value)}
                disabled={vm.isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="support-email" className="text-sm font-medium text-neutral-700">
                Email Supporto
              </label>
              <Input
                id="support-email"
                value={vm.supportEmail}
                onChange={(e) => vm.setSupportEmail(e.target.value)}
                disabled={vm.isLoading}
              />
            </div>
            <Button size="sm" onClick={vm.handleSaveGeneral} disabled={vm.isSaving || vm.isLoading}>
              {vm.isSaving ? 'Salvataggio...' : 'Salva modifiche'}
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
                value={vm.photoConfidence}
                onChange={(e) => vm.setPhotoConfidence(Number(e.target.value))}
                min={0}
                max={100}
                disabled={vm.isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="max-reports" className="text-sm font-medium text-neutral-700">
                Max segnalazioni prima di sospensione
              </label>
              <Input
                id="max-reports"
                type="number"
                value={vm.maxReports}
                onChange={(e) => vm.setMaxReports(Number(e.target.value))}
                min={1}
                disabled={vm.isLoading}
              />
            </div>
            <Button
              size="sm"
              onClick={vm.handleSaveModeration}
              disabled={vm.isSaving || vm.isLoading}
            >
              {vm.isSaving ? 'Salvataggio...' : 'Salva modifiche'}
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
              <Button variant="destructive" size="sm" onClick={vm.handleClearCache}>
                Svuota
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
