import { passkeyCredentials } from '@pawmeet/db';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PasskeyCredentialRecord, PasskeyRepository } from '../ports/passkey-repository.js';

export class DrizzlePasskeyRepository implements PasskeyRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: string): Promise<PasskeyCredentialRecord | null> {
    const rows = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.id, id));
    return (rows[0] as PasskeyCredentialRecord | undefined) ?? null;
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredentialRecord | null> {
    const rows = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialId));
    return (rows[0] as PasskeyCredentialRecord | undefined) ?? null;
  }

  async findByUserId(userId: string): Promise<PasskeyCredentialRecord[]> {
    return (await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId))) as PasskeyCredentialRecord[];
  }

  async create(input: {
    userId: string;
    credentialId: string;
    publicKey: Buffer;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports?: string[];
    friendlyName?: string;
  }): Promise<PasskeyCredentialRecord> {
    const rows = await this.db
      .insert(passkeyCredentials)
      .values({
        userId: input.userId,
        credentialId: input.credentialId,
        publicKey: input.publicKey,
        counter: input.counter,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        transports: input.transports ?? null,
        friendlyName: input.friendlyName ?? null,
      })
      .returning();
    return rows[0] as PasskeyCredentialRecord;
  }

  async updateCounter(id: string, counter: number): Promise<void> {
    await this.db
      .update(passkeyCredentials)
      .set({ counter, lastUsedAt: new Date() })
      .where(eq(passkeyCredentials.id, id));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .delete(passkeyCredentials)
      .where(and(eq(passkeyCredentials.id, id), eq(passkeyCredentials.userId, userId)))
      .returning({ id: passkeyCredentials.id });
    return rows.length > 0;
  }

  async countByUserId(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));
    return result[0]?.count ?? 0;
  }
}
