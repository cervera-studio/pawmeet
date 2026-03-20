'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BadgeDefinition {
  type: string;
  category: 'walks' | 'matches' | 'social' | 'special';
  criteria: string;
}

export function BadgesOverview() {
  const t = useTranslations('badges');

  const badges: BadgeDefinition[] = useMemo(
    () => [
      { type: 'first_walk', category: 'walks', criteria: t('criteria.first_walk') },
      { type: 'walks_10', category: 'walks', criteria: t('criteria.walks_10') },
      { type: 'walks_50', category: 'walks', criteria: t('criteria.walks_50') },
      { type: 'walks_100', category: 'walks', criteria: t('criteria.walks_100') },
      { type: 'first_match', category: 'matches', criteria: t('criteria.first_match') },
      { type: 'matches_10', category: 'matches', criteria: t('criteria.matches_10') },
      { type: 'first_group_event', category: 'social', criteria: t('criteria.first_group_event') },
      { type: 'social_butterfly', category: 'social', criteria: t('criteria.social_butterfly') },
      { type: 'marathon_walker', category: 'special', criteria: t('criteria.marathon_walker') },
    ],
    [t],
  );

  const categoryVariants: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
    walks: 'default',
    matches: 'success',
    social: 'secondary',
    special: 'outline',
  };

  const grouped = useMemo(() => {
    const map = new Map<string, BadgeDefinition[]>();
    for (const badge of badges) {
      const list = map.get(badge.category) ?? [];
      list.push(badge);
      map.set(badge.category, list);
    }
    return map;
  }, [badges]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('info.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">{t('info.description')}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from(grouped.entries()).map(([category, categoryBadges]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant={categoryVariants[category] ?? 'outline'}>
                  {t(
                    `categories.${category}` as
                      | 'categories.walks'
                      | 'categories.matches'
                      | 'categories.social'
                      | 'categories.special',
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryBadges.map((badge) => (
                  <div
                    key={badge.type}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t(
                          `types.${badge.type}` as
                            | 'types.first_walk'
                            | 'types.walks_10'
                            | 'types.walks_50'
                            | 'types.walks_100'
                            | 'types.first_match'
                            | 'types.matches_10'
                            | 'types.first_group_event'
                            | 'types.social_butterfly'
                            | 'types.marathon_walker',
                        )}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">{badge.criteria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
