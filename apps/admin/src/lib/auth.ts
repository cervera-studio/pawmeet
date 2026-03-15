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
  '/safety': AdminRole.Moderator,
  '/account-deletions': AdminRole.Admin,
  '/organizations': AdminRole.Moderator,
  '/group-events': AdminRole.Moderator,
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
