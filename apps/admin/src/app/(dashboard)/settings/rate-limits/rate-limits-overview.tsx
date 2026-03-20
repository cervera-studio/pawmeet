'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RateLimitRule {
  name: string;
  limit: number;
  window: string;
  prefix: string;
  scope: 'ip' | 'user' | 'email';
}

export function RateLimitsOverview() {
  const t = useTranslations('rateLimits');

  const rules: RateLimitRule[] = useMemo(
    () => [
      {
        name: t('rules.api.name'),
        limit: 100,
        window: t('rules.api.window'),
        prefix: 'rl:api',
        scope: 'user',
      },
      {
        name: t('rules.auth.name'),
        limit: 10,
        window: t('rules.auth.window'),
        prefix: 'rl:auth',
        scope: 'ip',
      },
      {
        name: t('rules.passwordReset.name'),
        limit: 3,
        window: t('rules.passwordReset.window'),
        prefix: 'rl:pwd-reset',
        scope: 'ip',
      },
      {
        name: t('rules.passwordResetEmail.name'),
        limit: 3,
        window: t('rules.passwordResetEmail.window'),
        prefix: 'rl:pwd-reset-email',
        scope: 'email',
      },
      {
        name: t('rules.analytics.name'),
        limit: 500,
        window: t('rules.analytics.window'),
        prefix: 'rl:analytics',
        scope: 'user',
      },
    ],
    [t],
  );

  const scopeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    ip: 'default',
    user: 'secondary',
    email: 'outline',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('info.title')}</CardTitle>
          <CardDescription>{t('info.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">{t('info.note')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('columns.endpoint')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('columns.limit')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('columns.window')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('columns.scope')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('columns.prefix')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.prefix} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{rule.name}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-sm font-medium text-primary-700 dark:text-primary-300">
                        {rule.limit}
                      </span>
                    </td>
                    <td className="px-3 py-2">{rule.window}</td>
                    <td className="px-3 py-2">
                      <Badge variant={scopeVariants[rule.scope] ?? 'outline'}>
                        {t(`scopes.${rule.scope}` as 'scopes.ip' | 'scopes.user' | 'scopes.email')}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
                        {rule.prefix}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
