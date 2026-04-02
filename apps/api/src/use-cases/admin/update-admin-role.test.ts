import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { AdminSettingsRepository } from '../../ports/admin-data-repository.js';
import { createUpdateAdminRole } from './update-admin-role.js';

function buildAdminDataRepo(
  overrides: Partial<Pick<AdminSettingsRepository, 'findAdminUserById' | 'updateAdminRole'>> = {},
) {
  return {
    findAdminUserById: vi.fn().mockResolvedValue({
      id: 'admin-target',
      role: 'viewer',
      isActive: true,
      displayName: 'Target Admin',
    }),
    updateAdminRole: vi.fn().mockResolvedValue({
      id: 'admin-target',
      email: 'target@example.com',
      displayName: 'Target Admin',
      role: 'moderator',
    }),
    ...overrides,
  };
}

describe('updateAdminRole', () => {
  const baseInput = {
    adminId: 'admin-target',
    newRole: 'moderator' as const,
    callerUserId: 'admin-caller',
    callerRole: 'admin' as const,
  };

  it('updates admin role successfully', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.role).toBe('moderator');
    expect(result.data.previousRole).toBe('viewer');
    expect(result.data.id).toBe('admin-target');
  });

  it('fails when trying to change own role', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase({
      ...baseInput,
      adminId: 'admin-caller',
      callerUserId: 'admin-caller',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SELF_ROLE_CHANGE');
    expect(result.error.status).toBe(400);
  });

  it('fails when setting role higher than caller', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase({
      ...baseInput,
      newRole: 'super_admin',
      callerRole: 'admin',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ROLE_HIERARCHY_VIOLATION');
    expect(result.error.status).toBe(403);
  });

  it('fails when target admin is not found', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findAdminUserById: vi.fn().mockResolvedValue(null),
    });
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ADMIN_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails when target has equal or higher role than caller', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findAdminUserById: vi.fn().mockResolvedValue({
        id: 'admin-target',
        role: 'admin',
        isActive: true,
        displayName: 'Target Admin',
      }),
    });
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('CANNOT_MODIFY_HIGHER_ROLE');
    expect(result.error.status).toBe(403);
  });

  it('fails when updateAdminRole returns null', async () => {
    const adminDataRepo = buildAdminDataRepo({
      updateAdminRole: vi.fn().mockResolvedValue(null),
    });
    const useCase = createUpdateAdminRole({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ADMIN_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
