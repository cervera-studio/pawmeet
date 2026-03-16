import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlagsTable } from './flags-table';

export default async function FlagsPage() {
  const t = await getTranslations('aiMatching.flags');

  const flags = [
    {
      name: 'ml_matching_enabled',
      description: t('flagMlMatching'),
      type: 'boolean',
      enabled: false,
      split: '—',
    },
    {
      name: 'ml_scoring_strategy',
      description: t('flagScoringStrategy'),
      type: 'string',
      enabled: true,
      split: 'rule_based: 100%',
    },
    {
      name: 'ab_test_ml_matching',
      description: t('flagAbTest'),
      type: 'experiment',
      enabled: false,
      split: 'control: 50% / treatment: 50%',
    },
    {
      name: 'ml_confidence_threshold',
      description: t('flagConfidenceThreshold'),
      type: 'number',
      enabled: true,
      split: '0.7',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t('title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FlagsTable
            flags={flags}
            columns={{
              name: t('columnName'),
              description: t('columnDescription'),
              type: t('columnType'),
              status: t('columnStatus'),
              split: t('columnSplit'),
            }}
            labels={{
              enabled: t('enabled'),
              disabled: t('disabled'),
              edit: 'Modifica',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
