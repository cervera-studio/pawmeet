'use client';

import { type AdminRole, hasRole } from './auth';
import { useAuthContext } from './auth-store';

/**
 * Hook to check if the current admin has at least the given role.
 * Use this to conditionally show/hide UI elements based on role.
 */
export function usePermission(requiredRole: AdminRole): boolean {
  const { user } = useAuthContext();
  if (!user) return false;
  return hasRole(user.role, requiredRole);
}
