import { userConsents } from '@pawmeet/db';
import { and, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { ConsentRecord, ConsentRepository } from '../ports/consent-repository.js';

export type { ConsentRecord, ConsentRepository };

export class DrizzleConsentRepository implements ConsentRepository {
  constructor(private db: NeonHttpDatabase) {}

  async upsert(
    userId: string,
    consentType: string,
    granted: boolean,
    source: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    const now = new Date();
    const existing = await this.db
      .select()
      .from(userConsents)
      .where(and(eq(userConsents.userId, userId), eq(userConsents.consentType, consentType)))
      .then((rows) => rows[0]);

    if (existing) {
      await this.db
        .update(userConsents)
        .set({
          granted,
          grantedAt: granted ? now : existing.grantedAt,
          withdrawnAt: granted ? null : now,
          ipAddress,
          userAgent,
          source,
          updatedAt: now,
        })
        .where(eq(userConsents.id, existing.id));
    } else {
      await this.db.insert(userConsents).values({
        userId,
        consentType,
        granted,
        grantedAt: now,
        withdrawnAt: granted ? null : now,
        ipAddress,
        userAgent,
        source,
      });
    }
  }

  async findByUser(userId: string): Promise<ConsentRecord[]> {
    const rows = await this.db
      .select({
        consentType: userConsents.consentType,
        granted: userConsents.granted,
        grantedAt: userConsents.grantedAt,
        source: userConsents.source,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId));
    return rows;
  }
}
