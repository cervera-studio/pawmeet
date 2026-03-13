import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AppSettings } from '@/repositories';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const api = await getServerTrpcClient();
  const settings: AppSettings = await api.admin.getSettings.query();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
