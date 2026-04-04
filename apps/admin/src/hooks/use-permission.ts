'use client';

import { useCallback } from 'react';
import type { AdminRole } from '@/lib/auth';
import { ADMIN_ROLE, hasRole } from '@/lib/auth';
import { useAuthContext } from '@/lib/auth-store';

export function usePermission() {
  const { user, isAuthenticated } = useAuthContext();
  const role = user?.role ?? ADMIN_ROLE.VIEWER;

  const can = useCallback((requiredRole: AdminRole) => hasRole(role, requiredRole), [role]);

  const isSuperAdmin = role === ADMIN_ROLE.SUPER_ADMIN;
  const isAdmin = hasRole(role, ADMIN_ROLE.ADMIN);
  const isModerator = hasRole(role, ADMIN_ROLE.MODERATOR);

  return {
    role,
    isAuthenticated,
    can,
    isSuperAdmin,
    isAdmin,
    isModerator,
  };
}
