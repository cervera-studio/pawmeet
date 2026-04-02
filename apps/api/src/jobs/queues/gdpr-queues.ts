import { createLazyQueue } from './connection.js';

// --- Queue getter ---

export const getGdprExportQueue = createLazyQueue('gdpr-export', {
  attempts: 2,
  backoff: { type: 'fixed', delay: 60_000 },
  removeOnComplete: 50,
  removeOnFail: 100,
});

// --- Job data type ---

export interface GdprExportJobData {
  userId: string;
  email: string;
  displayName: string;
  exportId: string;
  locale?: string;
}

// --- Enqueue helper ---

export async function enqueueGdprExport(data: GdprExportJobData) {
  return getGdprExportQueue().add('export', data, {
    jobId: `gdpr-export-${data.userId}`,
  });
}
