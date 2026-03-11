import { getServerTrpcClient } from '@/lib/server-api';
import type { AppSettings } from '@/repositories';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const api = await getServerTrpcClient();
  const settings: AppSettings = await api.admin.getSettings.query();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Impostazioni</h1>
        <p className="text-neutral-500">Configura il pannello di amministrazione</p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
