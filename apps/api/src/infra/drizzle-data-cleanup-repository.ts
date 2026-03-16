import { gdprExports, messages, users } from '@pawmeet/db';
import { and, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { DataCleanupRepository } from '../ports/data-cleanup-repository.js';

export class DrizzleDataCleanupRepository implements DataCleanupRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async purgeDeactivatedAccounts(now: Date): Promise<{ id: string; email: string }[]> {
    const deleted = await this.db
      .delete(users)
      .where(
        and(
          eq(users.isActive, false),
          isNotNull(users.deletionScheduledAt),
          lt(users.deletionScheduledAt, now),
        ),
      )
      .returning({ id: users.id, email: users.email });

    return deleted;
  }

  async cleanExpiredRefreshTokens(): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM refresh_tokens WHERE revoked = true OR expires_at < NOW()`,
    );
  }

  async cleanExpiredVerificationTokens(olderThan: Date): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM verification_tokens WHERE used_at IS NOT NULL OR expires_at < ${olderThan}`,
    );
  }

  async findStaleInactiveMatchIds(olderThan: Date): Promise<string[]> {
    const staleMatchIds = await this.db.execute<{ id: string }>(
      sql`SELECT id FROM matches WHERE is_active = false AND created_at < ${olderThan}`,
    );

    return staleMatchIds.rows.map((r) => r.id);
  }

  async hardDeleteSoftDeletedMessages(matchIds: string[]): Promise<void> {
    if (matchIds.length === 0) return;

    await this.db
      .delete(messages)
      .where(and(eq(messages.isDeleted, true), inArray(messages.matchId, matchIds)));
  }

  async findExpiredGdprExports(): Promise<{ id: string; r2Key: string | null }[]> {
    const expiredExports = await this.db
      .select({ id: gdprExports.id, r2Key: gdprExports.r2Key })
      .from(gdprExports)
      .where(
        and(
          eq(gdprExports.status, 'completed'),
          isNotNull(gdprExports.expiresAt),
          lt(gdprExports.expiresAt, new Date()),
        ),
      );

    return expiredExports;
  }

  async deleteGdprExports(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.db.delete(gdprExports).where(
      sql`id IN (${sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
}
