import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { hash } from 'bcryptjs';
import { type AdminRoleValue, hasMinRole } from '../../lib/admin-permissions.js';
import type { AdminSettingsRepository, AdminUserRow } from '../../ports/admin-data-repository.js';

type Deps = {
  adminDataRepo: Pick<AdminSettingsRepository, 'findAdminUserByEmail' | 'createAdminUser'>;
};

interface CreateAdminUserInput {
  email: string;
  displayName: string;
  role: AdminRoleValue;
  temporaryPassword: string;
  callerRole: AdminRoleValue;
}

export function createCreateAdminUser({ adminDataRepo }: Deps) {
  return async (input: CreateAdminUserInput): Promise<Result<AdminUserRow>> => {
    if (!hasMinRole(input.callerRole, input.role)) {
      return fail(
        new AppError(
          'ROLE_HIERARCHY_VIOLATION',
          'Cannot create a user with a role higher than your own',
          403,
        ),
      );
    }

    const existing = await adminDataRepo.findAdminUserByEmail(input.email);
    if (existing) {
      return fail(
        new AppError('ADMIN_EMAIL_EXISTS', 'An admin user with this email already exists', 409),
      );
    }

    const passwordHash = await hash(input.temporaryPassword, 12);

    const created = await adminDataRepo.createAdminUser({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      passwordHash,
    });

    if (!created) {
      return fail(new AppError('ADMIN_CREATE_FAILED', 'Failed to create admin', 500));
    }

    return succeed(created);
  };
}
