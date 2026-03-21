import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters';
import { fetchUser, fetchUserSessions } from '../actions';
import { UserActions } from './user-actions';
import { UserSessions } from './user-sessions';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const [user, sessions, t, tc] = await Promise.all([
    fetchUser(id),
    fetchUserSessions(id),
    getTranslations('users'),
    getTranslations('common'),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-2xl font-bold text-primary-700 dark:text-primary-300">
            {(user.displayName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{user.displayName}</h1>
            <p className="text-neutral-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={user.status} type="user" />
          <UserActions userId={id} initialStatus={user.status} />
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t('detail.name')} value={user.displayName ?? '-'} />
            <InfoRow label={t('detail.email')} value={user.email ?? '-'} />
            <InfoRow label={t('detail.provider')} value={user.authProvider ?? '-'} />
            <InfoRow label={t('detail.registeredAt')} value={formatDate(user.createdAt)} />
            <InfoRow
              label={t('detail.lastLogin')}
              value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : tc('never')}
            />
            <InfoRow label={t('detail.followers')} value={formatNumber(user.followersCount)} />
            <InfoRow label={t('detail.following')} value={formatNumber(user.followingCount)} />
            <InfoRow
              label={t('detail.reportsReceived')}
              value={formatNumber(user.reportsReceived)}
            />
            <InfoRow label={t('detail.totalMatches')} value={formatNumber(user.matchesCount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('detail.dogsCount', { count: user.dogs.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.dogs.length === 0 ? (
              <p className="text-sm text-neutral-500">{t('detail.noDogs')}</p>
            ) : (
              <div className="space-y-3">
                {user.dogs.map((dog) => (
                  <div key={dog.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{dog.name}</p>
                      <p className="text-xs text-neutral-500">{dog.breed}</p>
                    </div>
                    <Badge variant={dog.isActive ? 'success' : 'outline'}>
                      {dog.isActive ? tc('active') : tc('inactive')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('detail.passkeysCount', { count: user.passkeys?.length ?? 0 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.passkeys?.length ? (
              <div className="space-y-3">
                {user.passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {pk.friendlyName ?? 'Passkey'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {pk.deviceType === 'multiDevice' ? 'Sincronizzata' : 'Singolo dispositivo'}
                        {pk.lastUsedAt ? ` · ${formatDate(pk.lastUsedAt)}` : ''}
                      </p>
                    </div>
                    <Badge variant={pk.backedUp ? 'success' : 'outline'}>
                      {pk.backedUp ? 'Backup' : 'Locale'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{t('detail.noPasskeys')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href={`/moderation/reports?user=${id}`}
              className="inline-flex w-full items-center justify-start h-9 rounded-md border border-neutral-200 bg-surface px-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              {t('detail.viewReports')}
            </a>
            <a
              href={`/moderation/photos?user=${id}`}
              className="inline-flex w-full items-center justify-start h-9 rounded-md border border-neutral-200 bg-surface px-3 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              {t('detail.viewPhotos')}
            </a>
          </CardContent>
        </Card>

        <UserSessions userId={id} sessions={sessions} />
      </div>
    </div>
  );
}
