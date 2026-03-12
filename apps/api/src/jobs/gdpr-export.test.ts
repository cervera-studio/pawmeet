import { fail, succeed } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailService } from '../ports/email-service.js';
import type { GdprExportRepository } from '../ports/gdpr-export-repository.js';
import type { StorageService } from '../ports/storage-service.js';
import {
  buildEmailService,
  buildGdprExportRepo,
  buildStorageService,
} from '../test-utils/builders.js';

// Capture the processor function passed to the BullMQ Worker constructor
let capturedProcessor: (job: { data: Record<string, unknown> }) => Promise<void>;

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

vi.mock('./queue.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  QUEUE_NAMES: { GDPR_EXPORT: 'gdpr-export' },
}));

vi.mock('../lib/security-log.js', () => ({
  logSecurityEvent: vi.fn(),
  SECURITY_EVENT: {
    GdprExportCompleted: 'gdpr_export_completed',
    GdprExportFailed: 'gdpr_export_failed',
  },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const JOB_DATA = {
  userId: 'user-123',
  email: 'user@example.com',
  displayName: 'Mario Rossi',
  exportId: 'export-456',
};

const EXPORT_PAYLOAD = {
  profile: { id: 'user-123', name: 'Mario Rossi' },
  dogs: [{ name: 'Fido' }],
};

describe('createGdprExportWorker', () => {
  let exportUserData: ReturnType<typeof vi.fn>;
  let gdprExportRepo: GdprExportRepository;
  let storage: StorageService;
  let emailService: EmailService;

  beforeEach(async () => {
    vi.clearAllMocks();

    exportUserData = vi.fn().mockResolvedValue(succeed(EXPORT_PAYLOAD));
    gdprExportRepo = buildGdprExportRepo();
    storage = buildStorageService();
    emailService = buildEmailService();

    // Import lazily so mocks are in place
    const { createGdprExportWorker } = await import('./gdpr-export.js');
    createGdprExportWorker({ exportUserData, gdprExportRepo, storage, emailService });
  });

  it('processes export successfully', async () => {
    await capturedProcessor({ data: JOB_DATA });

    // Status transitions: first 'processing', then 'completed'
    expect(gdprExportRepo.updateExportStatus).toHaveBeenCalledTimes(2);
    expect(gdprExportRepo.updateExportStatus).toHaveBeenNthCalledWith(
      1,
      'export-456',
      'processing',
    );
    expect(gdprExportRepo.updateExportStatus).toHaveBeenNthCalledWith(
      2,
      'export-456',
      'completed',
      expect.objectContaining({
        r2Key: expect.stringContaining('exports/user-123/'),
        expiresAt: expect.any(Date),
        completedAt: expect.any(Date),
      }),
    );

    // Upload and email
    expect(storage.uploadObject).toHaveBeenCalledTimes(1);
    expect(emailService.sendGdprExportReady).toHaveBeenCalledWith(
      'user@example.com',
      'Mario Rossi',
      expect.any(String),
    );
  });

  it('throws when exportUserData fails', async () => {
    exportUserData.mockResolvedValue(fail({ code: 'NOT_FOUND', message: 'User not found' }));

    await expect(capturedProcessor({ data: JOB_DATA })).rejects.toThrow('Export failed');

    // Should still have been marked as processing before the failure
    expect(gdprExportRepo.updateExportStatus).toHaveBeenCalledWith('export-456', 'processing');

    // Should NOT have uploaded or sent email
    expect(storage.uploadObject).not.toHaveBeenCalled();
    expect(emailService.sendGdprExportReady).not.toHaveBeenCalled();
  });

  it('uploads JSON to R2 with correct content type', async () => {
    await capturedProcessor({ data: JOB_DATA });

    const expectedJson = JSON.stringify(EXPORT_PAYLOAD, null, 2);

    expect(storage.uploadObject).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/user-123\/\d+\.json$/),
      expectedJson,
      'application/json',
    );
  });
});
