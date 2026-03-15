import { getTranslations } from 'next-intl/server';
import { fetchSettings } from './actions';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const [settings, t] = await Promise.all([fetchSettings(), getTranslations('settings')]);

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
