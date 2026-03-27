'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/formatters';

const ALL_CONSENT_TYPES = [
  'analytics',
  'ab_testing',
  'error_tracking',
  'marketing',
  'ai_training',
] as const;

interface Consent {
  consentType: string;
  granted: boolean;
  grantedAt: string;
  withdrawnAt: string | null;
  source: string;
}

interface UserConsentsProps {
  consents: Consent[];
}

export function UserConsents({ consents }: UserConsentsProps) {
  const t = useTranslations('users.detail');

  const consentMap = new Map(consents.map((c) => [c.consentType, c]));

  return (
    <Card className="lg:col-span-2 xl:col-span-3">
      <CardHeader>
        <CardTitle className="text-base">{t('consentsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ALL_CONSENT_TYPES.map((type) => {
            const consent = consentMap.get(type);
            const granted = consent?.granted ?? false;
            return (
              <div key={type} className="rounded-lg border border-neutral-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">
                    {t(`consentType.${type}` as string)}
                  </span>
                  <Badge variant={granted ? 'success' : 'outline'}>
                    {granted ? t('consentGranted') : t('consentNotGranted')}
                  </Badge>
                </div>
                {consent && (
                  <div className="text-xs text-neutral-500 space-y-0.5">
                    {consent.grantedAt && (
                      <p>
                        {t('consentGrantedAt')}: {formatDateTime(consent.grantedAt)}
                      </p>
                    )}
                    {consent.withdrawnAt && (
                      <p>
                        {t('consentWithdrawnAt')}: {formatDateTime(consent.withdrawnAt)}
                      </p>
                    )}
                    <p>{t(`consentSource.${consent.source}` as string)}</p>
                  </div>
                )}
                {!consent && <p className="text-xs text-neutral-400">{t('consentNeverSet')}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
