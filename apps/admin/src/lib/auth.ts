export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarUrl?: string;
}

/**
 * Get the current admin user from cookies/session.
 * TODO: Implement actual auth logic (JWT decode, session check, etc.)
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  // Placeholder: in production, decode JWT from cookies
  return null;
}

/**
 * Check if the user has the required role.
 */
export function hasRole(userRole: AdminRole, requiredRole: AdminRole): boolean {
  const hierarchy: Record<AdminRole, number> = {
    super_admin: 4,
    admin: 3,
    moderator: 2,
    viewer: 1,
  };

  return hierarchy[userRole] >= hierarchy[requiredRole];
}

/**
 * Route-based permission map.
 */
export const routePermissions: Record<string, AdminRole> = {
  '/settings': 'admin',
  '/users': 'moderator',
  '/moderation': 'moderator',
  '/dogs': 'moderator',
  '/': 'viewer',
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
