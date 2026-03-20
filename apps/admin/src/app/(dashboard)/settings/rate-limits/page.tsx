import { getTranslations } from 'next-intl/server';
import { RateLimitsOverview } from './rate-limits-overview';

export default async function RateLimitsPage() {
  const t = await getTranslations('rateLimits');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <RateLimitsOverview />
    </div>
  );
}
