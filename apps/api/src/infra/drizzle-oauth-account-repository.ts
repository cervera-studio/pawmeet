import { oauthAccounts } from '@pawmeet/db';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  OAuthAccountRecord,
  OAuthAccountRepository,
} from '../ports/oauth-account-repository.js';
import { firstRow, firstRowOrNull } from './drizzle-helpers.js';

export class DrizzleOAuthAccountRepository implements OAuthAccountRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findByProviderUid(
    provider: string,
    providerUserId: string,
  ): Promise<OAuthAccountRecord | null> {
    const rows = await this.db
      .select()
      .from(oauthAccounts)
      .where(
        and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, providerUserId)),
      );
    return firstRowOrNull<OAuthAccountRecord>(rows);
  }

  async findByUserId(userId: string): Promise<OAuthAccountRecord[]> {
    return this.db
      .select()
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId)) as unknown as OAuthAccountRecord[];
  }

  async upsert(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string | null;
  }): Promise<OAuthAccountRecord> {
    const rows = await this.db
      .insert(oauthAccounts)
      .values({
        userId: input.userId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        providerEmail: input.providerEmail ?? null,
      })
      .onConflictDoUpdate({
        target: [oauthAccounts.provider, oauthAccounts.providerUserId],
        set: {
          providerEmail: input.providerEmail ?? null,
        },
      })
      .returning();
    return firstRow<OAuthAccountRecord>(rows);
  }

  async deleteByUserAndProvider(userId: string, provider: string): Promise<void> {
    await this.db
      .delete(oauthAccounts)
      .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
  }
}
