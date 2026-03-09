'use client';

import { useCallback } from 'react';
import type { AdminRole as AdminRoleType } from '@/lib/auth';
import { AdminRole, hasRole } from '@/lib/auth';

function getPlaceholderRole(): AdminRoleType {
  return AdminRole.Admin;
}

/**
 * RBAC hook for checking permissions in components.
 * TODO: Wire up to actual auth context/session.
 */
export function usePermission() {
  // TODO: in production, get from auth context/session
  const role = getPlaceholderRole();
  const isAuthenticated = true;

  const can = useCallback((requiredRole: AdminRoleType) => hasRole(role, requiredRole), [role]);

  const isSuperAdmin = role === AdminRole.SuperAdmin;
  const isAdmin = hasRole(role, AdminRole.Admin);
  const isModerator = hasRole(role, AdminRole.Moderator);

  return {
    role,
    isAuthenticated,
    can,
    isSuperAdmin,
    isAdmin,
    isModerator,
  };
}
