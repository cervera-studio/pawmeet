import process from 'node:process';
import { ADMIN_ROLE, type AdminRole } from '@pawmeet/types';

export { ADMIN_ROLE, type AdminRole } from '@pawmeet/types';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarUrl?: string;
  totpEnabled?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Get the current admin user by verifying the access token against the API.
 * Returns `null` if no token is present or the token is expired/invalid.
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_access_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/admin/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data: { id: string; email: string; name: string; role: AdminRole } =
      await response.json();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
    };
  } catch {
    return null;
  }
}

/**
 * Check if the user has the required role.
 */
export function hasRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
  const hierarchy: Record<AdminRole, number> = {
    [ADMIN_ROLE.SUPER_ADMIN]: 4,
    [ADMIN_ROLE.ADMIN]: 3,
    [ADMIN_ROLE.MODERATOR]: 2,
    [ADMIN_ROLE.VIEWER]: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Route-based permission map.
 */
export const routePermissions: Record<string, AdminRole> = {
  '/settings': ADMIN_ROLE.ADMIN,
  '/audit-log': ADMIN_ROLE.ADMIN,
  '/users': ADMIN_ROLE.MODERATOR,
  '/moderation': ADMIN_ROLE.MODERATOR,
  '/dogs': ADMIN_ROLE.MODERATOR,
  '/breeds': ADMIN_ROLE.MODERATOR,
  '/safety': ADMIN_ROLE.MODERATOR,
  '/ai-matching': ADMIN_ROLE.ADMIN,
  '/notifications': ADMIN_ROLE.ADMIN,
  '/support': ADMIN_ROLE.MODERATOR,
  '/account-deletions': ADMIN_ROLE.ADMIN,
  '/organizations': ADMIN_ROLE.MODERATOR,
  '/group-events': ADMIN_ROLE.MODERATOR,
  '/challenges': ADMIN_ROLE.MODERATOR,
  '/badges': ADMIN_ROLE.MODERATOR,
  '/fitness': ADMIN_ROLE.MODERATOR,
  '/waitlist': ADMIN_ROLE.MODERATOR,
  '/': ADMIN_ROLE.VIEWER,
};

/**
 * Check if a role can access a given path.
 */
export function canAccessRoute(role: AdminRole, path: string): boolean {
  const requiredRole = Object.entries(routePermissions)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => path.startsWith(route));

  if (!requiredRole) return true;
  return hasRole(role, requiredRole[1]);
}
