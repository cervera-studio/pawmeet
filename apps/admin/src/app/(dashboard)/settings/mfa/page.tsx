import { getTranslations } from 'next-intl/server';
import { MfaSettings } from './mfa-settings';

export default async function MfaPage() {
  const t = await getTranslations('settings.mfa');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <MfaSettings />
    </div>
  );
}
