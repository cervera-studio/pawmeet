import { getTranslations } from 'next-intl/server';
import { fetchFitnessStats } from './actions';
import { FitnessStatsView } from './fitness-stats-view';

export default async function FitnessPage() {
  const [stats, t] = await Promise.all([fetchFitnessStats(), getTranslations('fitness')]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <FitnessStatsView stats={stats} />
    </div>
  );
}
