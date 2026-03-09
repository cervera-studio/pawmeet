'use client';

import { useCallback } from 'react';
import type { AdminRole } from '@/lib/auth';
import { hasRole } from '@/lib/auth';

/**
 * RBAC hook for checking permissions in components.
 * TODO: Wire up to actual auth context/session.
 */
export function usePermission() {
  // Placeholder: in production, get from auth context
  const role: AdminRole = 'admin';
  const isAuthenticated = true;

  const can = useCallback(
    (requiredRole: AdminRole) => hasRole(role, requiredRole),
    [role],
  );

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = hasRole(role, 'admin');
  const isModerator = hasRole(role, 'moderator');

  return {
    role,
    isAuthenticated,
    can,
    isSuperAdmin,
    isAdmin,
    isModerator,
  };
}
