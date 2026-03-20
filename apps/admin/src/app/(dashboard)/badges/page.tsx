import { getTranslations } from 'next-intl/server';
import { BadgesOverview } from './badges-overview';

export default async function BadgesPage() {
  const t = await getTranslations('badges');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <BadgesOverview />
    </div>
  );
}
