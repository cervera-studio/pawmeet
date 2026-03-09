import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsPage() {
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
              <label className="text-sm font-medium text-neutral-700">Nome App</label>
              <Input defaultValue="DogWalk" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Email Supporto</label>
              <Input defaultValue="support@dogwalk.app" />
            </div>
            <Button size="sm">Salva modifiche</Button>
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
              <label className="text-sm font-medium text-neutral-700">
                Soglia auto-approvazione foto (confidence %)
              </label>
              <Input type="number" defaultValue="95" min="0" max="100" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                Max segnalazioni prima di sospensione
              </label>
              <Input type="number" defaultValue="5" min="1" />
            </div>
            <Button size="sm">Salva modifiche</Button>
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
              <Button variant="destructive" size="sm">Svuota</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
