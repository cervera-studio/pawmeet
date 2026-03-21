import process from 'node:process';

export const AdminRole = {
  SuperAdmin: 'super_admin',
  Admin: 'admin',
  Moderator: 'moderator',
  Viewer: 'viewer',
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

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
    [AdminRole.SuperAdmin]: 4,
    [AdminRole.Admin]: 3,
    [AdminRole.Moderator]: 2,
    [AdminRole.Viewer]: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Route-based permission map.
 */
export const routePermissions: Record<string, AdminRole> = {
  '/settings': AdminRole.Admin,
  '/audit-log': AdminRole.Admin,
  '/users': AdminRole.Moderator,
  '/moderation': AdminRole.Moderator,
  '/dogs': AdminRole.Moderator,
  '/breeds': AdminRole.Moderator,
  '/safety': AdminRole.Moderator,
  '/ai-matching': AdminRole.Admin,
  '/notifications': AdminRole.Admin,
  '/support': AdminRole.Moderator,
  '/account-deletions': AdminRole.Admin,
  '/organizations': AdminRole.Moderator,
  '/group-events': AdminRole.Moderator,
  '/challenges': AdminRole.Moderator,
  '/badges': AdminRole.Moderator,
  '/fitness': AdminRole.Moderator,
  '/': AdminRole.Viewer,
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
