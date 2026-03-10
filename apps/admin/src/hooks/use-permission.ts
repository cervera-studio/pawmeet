'use client';

import { useCallback } from 'react';
import type { AdminRole as AdminRoleType } from '@/lib/auth';
import { AdminRole, hasRole } from '@/lib/auth';
import { useAuthContext } from '@/lib/auth-store';

export function usePermission() {
  const { user, isAuthenticated } = useAuthContext();
  const role = user?.role ?? AdminRole.Viewer;

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
