import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataCleanupRepository } from '../ports/data-cleanup-repository.js';
import type { StorageService } from '../ports/storage-service.js';

let capturedProcessor: () => Promise<void>;

vi.mock('bullmq', () => {
  const WorkerMock = function (
    this: { on: ReturnType<typeof vi.fn> },
    _name: string,
    processor: typeof capturedProcessor,
  ) {
    capturedProcessor = processor;
    this.on = vi.fn();
  };
  return { Worker: WorkerMock };
});

vi.mock('./queues/index.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  QUEUE_NAMES: { DATA_CLEANUP: 'data-cleanup' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function buildDataCleanupRepo(
  overrides: Partial<DataCleanupRepository> = {},
): DataCleanupRepository {
  return {
    purgeDeactivatedAccounts: vi.fn().mockResolvedValue([]),
    cleanExpiredRefreshTokens: vi.fn().mockResolvedValue(undefined),
    cleanExpiredVerificationTokens: vi.fn().mockResolvedValue(undefined),
    findStaleInactiveMatchIds: vi.fn().mockResolvedValue([]),
    hardDeleteSoftDeletedMessages: vi.fn().mockResolvedValue(undefined),
    findExpiredGdprExports: vi.fn().mockResolvedValue([]),
    deleteGdprExports: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildStorage(
  overrides: Partial<StorageService> = {},
): Pick<StorageService, 'deleteObject'> {
  return {
    deleteObject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createDataCleanupWorker', () => {
  let repo: ReturnType<typeof buildDataCleanupRepo>;
  let storage: ReturnType<typeof buildStorage>;

  beforeEach(async () => {
    vi.clearAllMocks();
    repo = buildDataCleanupRepo();
    storage = buildStorage();

    const { createDataCleanupWorker } = await import('./data-cleanup.js');
    createDataCleanupWorker({
      dataCleanupRepo: repo,
      storage: storage as unknown as StorageService,
    });
  });

  it('purges deactivated accounts and cleans tokens', async () => {
    (repo.purgeDeactivatedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'u1', email: 'a@b.com' },
    ]);

    await capturedProcessor();

    expect(repo.purgeDeactivatedAccounts).toHaveBeenCalledTimes(1);
    expect(repo.cleanExpiredRefreshTokens).toHaveBeenCalledTimes(1);
    expect(repo.cleanExpiredVerificationTokens).toHaveBeenCalledTimes(1);
  });

  it('handles no deactivated accounts gracefully', async () => {
    await capturedProcessor();

    expect(repo.purgeDeactivatedAccounts).toHaveBeenCalledTimes(1);
    expect(repo.cleanExpiredRefreshTokens).toHaveBeenCalledTimes(1);
  });

  it('hard-deletes soft-deleted messages from stale matches', async () => {
    (repo.findStaleInactiveMatchIds as ReturnType<typeof vi.fn>).mockResolvedValue([
      'match-1',
      'match-2',
    ]);

    await capturedProcessor();

    expect(repo.hardDeleteSoftDeletedMessages).toHaveBeenCalledWith(['match-1', 'match-2']);
  });

  it('skips message deletion when no stale matches exist', async () => {
    await capturedProcessor();

    expect(repo.hardDeleteSoftDeletedMessages).not.toHaveBeenCalled();
  });

  it('deletes expired GDPR export R2 objects and DB records', async () => {
    (repo.findExpiredGdprExports as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'exp-1', r2Key: 'gdpr/export-1.zip' },
      { id: 'exp-2', r2Key: 'gdpr/export-2.zip' },
    ]);

    await capturedProcessor();

    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(storage.deleteObject).toHaveBeenCalledWith('gdpr/export-1.zip');
    expect(storage.deleteObject).toHaveBeenCalledWith('gdpr/export-2.zip');
    expect(repo.deleteGdprExports).toHaveBeenCalledWith(['exp-1', 'exp-2']);
  });

  it('skips R2 deletion for exports with null r2Key', async () => {
    (repo.findExpiredGdprExports as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'exp-1', r2Key: null },
    ]);

    await capturedProcessor();

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(repo.deleteGdprExports).toHaveBeenCalledWith(['exp-1']);
  });

  it('continues when an R2 deletion fails', async () => {
    (repo.findExpiredGdprExports as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'exp-1', r2Key: 'gdpr/fail.zip' },
      { id: 'exp-2', r2Key: 'gdpr/ok.zip' },
    ]);
    (storage.deleteObject as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('R2 timeout'))
      .mockResolvedValueOnce(undefined);

    await capturedProcessor();

    expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    expect(repo.deleteGdprExports).toHaveBeenCalledWith(['exp-1', 'exp-2']);
  });

  it('skips GDPR cleanup when no storage service is provided', async () => {
    vi.clearAllMocks();
    repo = buildDataCleanupRepo({
      findExpiredGdprExports: vi.fn().mockResolvedValue([{ id: 'exp-1', r2Key: 'some/key' }]),
    });

    const { createDataCleanupWorker } = await import('./data-cleanup.js');
    createDataCleanupWorker({ dataCleanupRepo: repo });

    await capturedProcessor();

    expect(repo.deleteGdprExports).not.toHaveBeenCalled();
  });
});
