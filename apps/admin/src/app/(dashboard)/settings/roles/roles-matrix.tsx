'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RoleInfo {
  key: string;
  level: number;
}

interface RoutePermission {
  route: string;
  requiredRole: string;
}

export function RolesMatrix() {
  const t = useTranslations('roles');

  const roles: RoleInfo[] = useMemo(
    () => [
      { key: 'super_admin', level: 4 },
      { key: 'admin', level: 3 },
      { key: 'moderator', level: 2 },
      { key: 'viewer', level: 1 },
    ],
    [],
  );

  const routes: RoutePermission[] = useMemo(
    () => [
      { route: '/', requiredRole: 'viewer' },
      { route: '/users', requiredRole: 'moderator' },
      { route: '/moderation', requiredRole: 'moderator' },
      { route: '/dogs', requiredRole: 'moderator' },
      { route: '/breeds', requiredRole: 'moderator' },
      { route: '/group-events', requiredRole: 'moderator' },
      { route: '/challenges', requiredRole: 'moderator' },
      { route: '/badges', requiredRole: 'moderator' },
      { route: '/fitness', requiredRole: 'moderator' },
      { route: '/organizations', requiredRole: 'moderator' },
      { route: '/safety', requiredRole: 'moderator' },
      { route: '/support', requiredRole: 'moderator' },
      { route: '/ai-matching', requiredRole: 'admin' },
      { route: '/notifications', requiredRole: 'admin' },
      { route: '/account-deletions', requiredRole: 'admin' },
      { route: '/settings', requiredRole: 'admin' },
      { route: '/audit-log', requiredRole: 'admin' },
    ],
    [],
  );

  const roleLevel: Record<string, number> = {
    super_admin: 4,
    admin: 3,
    moderator: 2,
    viewer: 1,
  };

  function hasAccess(userRole: string, requiredRole: string): boolean {
    return (roleLevel[userRole] ?? 0) >= (roleLevel[requiredRole] ?? 0);
  }

  return (
    <div className="space-y-6">
      {/* Role hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('hierarchy.title')}</CardTitle>
          <CardDescription>{t('hierarchy.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.key} className="flex items-start gap-4 rounded-md border p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {role.level}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {t(`roleNames.${role.key}` as 'roleNames.super_admin' | 'roleNames.admin' | 'roleNames.moderator' | 'roleNames.viewer')}
                    </p>
                    <Badge variant="outline">{role.key}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t(`roleDescriptions.${role.key}` as 'roleDescriptions.super_admin' | 'roleDescriptions.admin' | 'roleDescriptions.moderator' | 'roleDescriptions.viewer')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('permissions.title')}</CardTitle>
          <CardDescription>{t('permissions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('permissions.route')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-neutral-500">
                    {t('permissions.requiredRole')}
                  </th>
                  {roles.map((role) => (
                    <th key={role.key} className="px-3 py-2 text-center font-medium text-neutral-500">
                      {t(`roleNames.${role.key}` as 'roleNames.super_admin' | 'roleNames.admin' | 'roleNames.moderator' | 'roleNames.viewer')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={route.route} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{route.route}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {route.requiredRole}
                      </Badge>
                    </td>
                    {roles.map((role) => (
                      <td key={role.key} className="px-3 py-2 text-center">
                        {hasAccess(role.key, route.requiredRole) ? (
                          <span className="text-green-600">&#10003;</span>
                        ) : (
                          <span className="text-neutral-300">&#10007;</span>
                        )}
                      </td>
                    ))}
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
