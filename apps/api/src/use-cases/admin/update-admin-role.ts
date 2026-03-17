import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { AdminDataRepository } from '../../ports/admin-data-repository.js';
import { type AdminRoleValue, hasMinRole } from '../../lib/admin-permissions.js';

type Deps = {
  adminDataRepo: Pick<AdminDataRepository, 'findAdminUserById' | 'updateAdminRole'>;
};

interface UpdateAdminRoleInput {
  adminId: string;
  newRole: AdminRoleValue;
  callerUserId: string;
  callerRole: AdminRoleValue;
}

interface UpdateAdminRoleOutput {
  id: string;
  email: string;
  displayName: string;
  role: string;
  previousRole: string;
}

export function createUpdateAdminRole({ adminDataRepo }: Deps) {
  return async (input: UpdateAdminRoleInput): Promise<Result<UpdateAdminRoleOutput>> => {
    if (input.adminId === input.callerUserId) {
      return fail(new AppError('SELF_ROLE_CHANGE', 'Cannot change your own role', 400));
    }

    if (!hasMinRole(input.callerRole, input.newRole)) {
      return fail(
        new AppError('ROLE_HIERARCHY_VIOLATION', 'Cannot set a role higher than your own', 403),
      );
    }

    const target = await adminDataRepo.findAdminUserById(input.adminId);
    if (!target) {
      return fail(new AppError('ADMIN_NOT_FOUND', 'Admin user not found', 404));
    }

    if (hasMinRole(target.role, input.callerRole)) {
      return fail(
        new AppError(
          'CANNOT_MODIFY_HIGHER_ROLE',
          'Cannot modify a user with equal or higher role',
          403,
        ),
      );
    }

    const updated = await adminDataRepo.updateAdminRole(input.adminId, input.newRole);
    if (!updated) {
      return fail(new AppError('ADMIN_NOT_FOUND', 'Admin user not found', 404));
    }

    return succeed({
      ...updated,
      previousRole: target.role,
    });
  };
}
