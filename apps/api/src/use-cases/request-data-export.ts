import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { GdprExportRepository } from '../ports/gdpr-export-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  userRepo: UserRepository;
  gdprExportRepo: GdprExportRepository;
  enqueueExport: (data: {
    userId: string;
    email: string;
    displayName: string;
    exportId: string;
  }) => Promise<unknown>;
}

/**
 * Request an async GDPR data export.
 * Creates a DB record, enqueues a BullMQ job, returns immediately.
 */
export function createRequestDataExport(deps: Deps) {
  return async (userId: string): Promise<Result<{ message: string }>> => {
    const { userRepo, gdprExportRepo, enqueueExport } = deps;

    // Check for already pending export
    const pending = await gdprExportRepo.findPendingExport(userId);
    if (pending) {
      return fail(
        new AppError(
          'EXPORT_ALREADY_PENDING',
          "Hai già un export in corso. Riceverai un'email quando sarà pronto.",
          409,
        ),
      );
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // Create DB tracking record
    const exportRecord = await gdprExportRepo.createExport(userId);

    // Enqueue BullMQ job
    await enqueueExport({
      userId,
      email: user.email,
      displayName: user.displayName,
      exportId: exportRecord.id,
    });

    return succeed({ message: "Export in corso. Riceverai un'email quando sarà pronto." });
  };
}
