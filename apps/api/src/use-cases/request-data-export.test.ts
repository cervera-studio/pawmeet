import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGdprExportRepo, buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createRequestDataExport } from './request-data-export.js';

describe('requestDataExport', () => {
  const userId = 'user-1';

  it('fails with EXPORT_ALREADY_PENDING when an export is in progress', async () => {
    const gdprExportRepo = buildGdprExportRepo({
      findPendingExport: vi.fn().mockResolvedValue({
        id: 'export-1',
        status: 'pending',
        requestedAt: new Date(),
        completedAt: null,
      }),
    });
    const userRepo = buildUserRepo();
    const enqueueExport = vi.fn();
    const requestDataExport = createRequestDataExport({
      userRepo,
      gdprExportRepo,
      enqueueExport,
    });

    const result = await requestDataExport(userId);

    if (isSuccess(result)) {
      expect.unreachable('Expected failure');
      return;
    }

    expect(result.error.code).toBe('EXPORT_ALREADY_PENDING');
    expect(result.error.status).toBe(409);
    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(enqueueExport).not.toHaveBeenCalled();
  });

  it('fails with USER_NOT_FOUND when user does not exist', async () => {
    const gdprExportRepo = buildGdprExportRepo({
      findPendingExport: vi.fn().mockResolvedValue(null),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const enqueueExport = vi.fn();
    const requestDataExport = createRequestDataExport({
      userRepo,
      gdprExportRepo,
      enqueueExport,
    });

    const result = await requestDataExport(userId);

    if (isSuccess(result)) {
      expect.unreachable('Expected failure');
      return;
    }

    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
    expect(enqueueExport).not.toHaveBeenCalled();
  });

  it('creates export record and enqueues job on success', async () => {
    const user = buildUser({ id: userId, email: 'mario@example.com', displayName: 'Mario Rossi' });
    const exportRecord = {
      id: 'export-1',
      status: 'pending' as const,
      requestedAt: new Date(),
      completedAt: null,
    };
    const gdprExportRepo = buildGdprExportRepo({
      findPendingExport: vi.fn().mockResolvedValue(null),
      createExport: vi.fn().mockResolvedValue(exportRecord),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
    });
    const enqueueExport = vi.fn().mockResolvedValue(undefined);
    const requestDataExport = createRequestDataExport({
      userRepo,
      gdprExportRepo,
      enqueueExport,
    });

    const result = await requestDataExport(userId);

    if (isFailure(result)) {
      expect.unreachable('Expected success');
      return;
    }

    expect(result.data.message).toBe('Export in progress. You will receive an email when ready.');
    expect(gdprExportRepo.createExport).toHaveBeenCalledWith(userId);
    expect(enqueueExport).toHaveBeenCalledWith({
      userId,
      email: 'mario@example.com',
      displayName: 'Mario Rossi',
      exportId: 'export-1',
      locale: 'it',
    });
  });

  it('does not enqueue if createExport throws', async () => {
    const user = buildUser({ id: userId });
    const gdprExportRepo = buildGdprExportRepo({
      findPendingExport: vi.fn().mockResolvedValue(null),
      createExport: vi.fn().mockRejectedValue(new Error('DB error')),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
    });
    const enqueueExport = vi.fn();
    const requestDataExport = createRequestDataExport({
      userRepo,
      gdprExportRepo,
      enqueueExport,
    });

    await expect(requestDataExport(userId)).rejects.toThrow('DB error');
    expect(enqueueExport).not.toHaveBeenCalled();
  });
});
