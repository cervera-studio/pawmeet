import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchFeatureFlags } from './actions';
import { FlagsTable } from './flags-table';

export default async function FlagsPage() {
  const [{ flags }, t] = await Promise.all([
    fetchFeatureFlags(),
    getTranslations('aiMatching.flags'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nessun flag configurato.
            </p>
          ) : (
            <FlagsTable
              flags={flags}
              columns={{
                name: t('columnName'),
                status: t('columnStatus'),
                split: t('columnSplit'),
              }}
              labels={{
                enabled: t('enabled'),
                disabled: t('disabled'),
                edit: 'Modifica',
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
