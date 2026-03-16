import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columnName')}</TableHead>
                <TableHead>{t('columnDescription')}</TableHead>
                <TableHead>{t('columnType')}</TableHead>
                <TableHead>{t('columnStatus')}</TableHead>
                <TableHead>{t('columnSplit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.name}>
                  <TableCell className="font-mono text-sm">{flag.name}</TableCell>
                  <TableCell>{flag.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{flag.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={flag.enabled ? 'success' : 'secondary'}>
                      {flag.enabled ? t('enabled') : t('disabled')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                    {flag.split}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
