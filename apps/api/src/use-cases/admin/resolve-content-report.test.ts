import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type {
  AdminModerationRepository,
  AdminUserRepository,
} from '../../ports/admin-data-repository.js';
import { createResolveContentReport } from './resolve-content-report.js';

function buildAdminDataRepo(
  overrides: Partial<
    Pick<AdminModerationRepository, 'findReportById' | 'resolveReport'> &
      Pick<AdminUserRepository, 'deactivateUser'>
  > = {},
) {
  return {
    findReportById: vi
      .fn()
      .mockResolvedValue({ id: 'report-1', status: 'pending', reportedUserId: 'user-bad' }),
    resolveReport: vi.fn().mockResolvedValue(undefined),
    deactivateUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('resolveContentReport', () => {
  const baseInput = {
    reportId: 'report-1',
    action: 'dismiss' as const,
    adminId: 'admin-1',
  };

  it('dismisses a pending report', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.newStatus).toBe('dismissed');
    expect(result.data.reportedUserId).toBe('user-bad');
    expect(adminDataRepo.resolveReport).toHaveBeenCalledWith(
      'report-1',
      'dismissed',
      'admin-1',
      'dismiss',
    );
    expect(adminDataRepo.deactivateUser).not.toHaveBeenCalled();
  });

  it('resolves with warn action without deactivating user', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase({ ...baseInput, action: 'warn' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.newStatus).toBe('resolved');
    expect(adminDataRepo.deactivateUser).not.toHaveBeenCalled();
  });

  it('deactivates user on suspend action', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase({ ...baseInput, action: 'suspend' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.newStatus).toBe('resolved');
    expect(adminDataRepo.deactivateUser).toHaveBeenCalledWith('user-bad');
  });

  it('deactivates user on ban action', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase({ ...baseInput, action: 'ban' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.newStatus).toBe('resolved');
    expect(adminDataRepo.deactivateUser).toHaveBeenCalledWith('user-bad');
  });

  it('fails when report is not found', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findReportById: vi.fn().mockResolvedValue(null),
    });
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('REPORT_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails when report is already resolved', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findReportById: vi
        .fn()
        .mockResolvedValue({ id: 'report-1', status: 'resolved', reportedUserId: 'user-bad' }),
    });
    const useCase = createResolveContentReport({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('REPORT_ALREADY_RESOLVED');
    expect(result.error.status).toBe(400);
  });
});
