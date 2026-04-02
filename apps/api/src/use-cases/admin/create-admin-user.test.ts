import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { AdminSettingsRepository, AdminUserRow } from '../../ports/admin-data-repository.js';
import { createCreateAdminUser } from './create-admin-user.js';

function buildAdminDataRepo(
  overrides: Partial<
    Pick<AdminSettingsRepository, 'findAdminUserByEmail' | 'createAdminUser'>
  > = {},
) {
  return {
    findAdminUserByEmail: vi.fn().mockResolvedValue(null),
    createAdminUser: vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'new@example.com',
      displayName: 'New Admin',
      role: 'moderator',
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
    } satisfies AdminUserRow),
    ...overrides,
  };
}

describe('createAdminUser', () => {
  const baseInput = {
    email: 'new@example.com',
    displayName: 'New Admin',
    role: 'moderator' as const,
    temporaryPassword: 'Temp1234!',
    callerRole: 'admin' as const,
  };

  it('creates an admin user successfully', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createCreateAdminUser({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.email).toBe('new@example.com');
    expect(result.data.role).toBe('moderator');
    expect(adminDataRepo.createAdminUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        displayName: 'New Admin',
        role: 'moderator',
      }),
    );
  });

  it('fails when caller role is lower than target role', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createCreateAdminUser({ adminDataRepo });
    const result = await useCase({
      ...baseInput,
      role: 'super_admin',
      callerRole: 'admin',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ROLE_HIERARCHY_VIOLATION');
    expect(result.error.status).toBe(403);
  });

  it('fails when email already exists', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findAdminUserByEmail: vi.fn().mockResolvedValue({ id: 'existing-1' }),
    });
    const useCase = createCreateAdminUser({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ADMIN_EMAIL_EXISTS');
    expect(result.error.status).toBe(409);
  });

  it('fails when createAdminUser returns null', async () => {
    const adminDataRepo = buildAdminDataRepo({
      createAdminUser: vi.fn().mockResolvedValue(null),
    });
    const useCase = createCreateAdminUser({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ADMIN_CREATE_FAILED');
    expect(result.error.status).toBe(500);
  });

  it('hashes the password before storing', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createCreateAdminUser({ adminDataRepo });
    await useCase(baseInput);

    const callArgs = adminDataRepo.createAdminUser.mock.calls[0]![0] as { passwordHash: string };
    expect(callArgs.passwordHash).not.toBe(baseInput.temporaryPassword);
    expect(callArgs.passwordHash.startsWith('$2')).toBe(true);
  });
});
