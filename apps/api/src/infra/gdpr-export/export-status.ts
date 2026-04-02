import { gdprExports } from '@pawmeet/db';
import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GdprExportRecord } from '../../ports/gdpr-export-repository.js';

export function createExportStatusQueries(db: NodePgDatabase) {
  return {
    async createExport(userId: string): Promise<GdprExportRecord> {
      const rows = await db.insert(gdprExports).values({ userId, status: 'pending' }).returning({
        id: gdprExports.id,
        status: gdprExports.status,
        requestedAt: gdprExports.requestedAt,
        completedAt: gdprExports.completedAt,
      });
      return rows[0] as GdprExportRecord;
    },

    async findPendingExport(userId: string): Promise<GdprExportRecord | null> {
      const rows = await db
        .select({
          id: gdprExports.id,
          status: gdprExports.status,
          requestedAt: gdprExports.requestedAt,
          completedAt: gdprExports.completedAt,
        })
        .from(gdprExports)
        .where(
          and(
            eq(gdprExports.userId, userId),
            inArray(gdprExports.status, ['pending', 'processing']),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    async updateExportStatus(
      exportId: string,
      status: string,
      data?: { r2Key?: string; expiresAt?: Date; errorMessage?: string; completedAt?: Date },
    ): Promise<void> {
      await db
        .update(gdprExports)
        .set({
          status,
          r2Key: data?.r2Key,
          expiresAt: data?.expiresAt,
          errorMessage: data?.errorMessage,
          completedAt: data?.completedAt,
        })
        .where(eq(gdprExports.id, exportId));
    },
  };
}
