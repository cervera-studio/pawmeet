import { TRPCError } from '@trpc/server';

const AdminRole = {
  SuperAdmin: 'super_admin',
  Admin: 'admin',
  Moderator: 'moderator',
  Viewer: 'viewer',
} as const;

type AdminRoleValue = (typeof AdminRole)[keyof typeof AdminRole];

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  viewer: 1,
};

/**
 * Check if a role meets the minimum required role level.
 */
function hasMinRole(userRole: string, minRole: AdminRoleValue): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
}

/**
 * Assert that the admin has at least the required role.
 * Throws FORBIDDEN if not.
 */
function requireRole(adminRole: string, minRole: AdminRoleValue): void {
  if (!hasMinRole(adminRole, minRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Requires ${minRole} role or higher`,
    });
  }
}

export type { AdminRoleValue };
export { AdminRole, hasMinRole, requireRole };
