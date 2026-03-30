import { refreshTokens, type TokenType, verificationTokens } from '@pawmeet/db';
import { and, eq, gt, isNull, not } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  RefreshTokenRecord,
  TokenRepository,
  VerificationTokenRecord,
} from '../ports/token-repository.js';
import { firstRow, firstRowOrNull } from './drizzle-helpers.js';

export class DrizzleTokenRepository implements TokenRepository {
  constructor(private readonly db: NodePgDatabase) {}

  // Refresh tokens

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    familyId?: string;
    deviceName?: string | null;
    deviceOs?: string | null;
  }): Promise<RefreshTokenRecord> {
    const rows = await this.db
      .insert(refreshTokens)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ...(input.familyId ? { familyId: input.familyId } : {}),
        ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
        ...(input.deviceOs === undefined ? {} : { deviceOs: input.deviceOs }),
      })
      .returning();
    return firstRow<RefreshTokenRecord>(rows);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    return firstRowOrNull<RefreshTokenRecord>(rows);
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, id));
  }

  async revokeRefreshTokenAtomic(id: string): Promise<boolean> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(and(eq(refreshTokens.id, id), eq(refreshTokens.revoked, false)))
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.familyId, familyId));
  }

  async findActiveSessionsByUserId(userId: string): Promise<RefreshTokenRecord[]> {
    return this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revoked, false),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      );
  }

  async revokeAllOtherFamilies(userId: string, keepFamilyId: string): Promise<number> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revoked, false),
          not(eq(refreshTokens.familyId, keepFamilyId)),
        ),
      )
      .returning({ id: refreshTokens.id });
    return rows.length;
  }

  // Verification tokens

  async createVerificationToken(input: {
    userId: string;
    tokenHash: string;
    type: TokenType;
    expiresAt: Date;
  }): Promise<VerificationTokenRecord> {
    const rows = await this.db.insert(verificationTokens).values(input).returning();
    return firstRow<VerificationTokenRecord>(rows);
  }

  async findValidVerificationTokenByUser(
    userId: string,
    tokenHash: string,
    type: TokenType,
  ): Promise<VerificationTokenRecord | null> {
    const rows = await this.db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, type),
          gt(verificationTokens.expiresAt, new Date()),
          isNull(verificationTokens.usedAt),
        ),
      );
    return firstRowOrNull<VerificationTokenRecord>(rows);
  }

  async revokeAllVerificationTokens(userId: string, type: TokenType): Promise<void> {
    await this.db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, type),
          isNull(verificationTokens.usedAt),
        ),
      );
  }

  async markVerificationTokenUsed(id: string): Promise<void> {
    await this.db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, id));
  }

  async markVerificationTokenUsedAtomic(id: string): Promise<boolean> {
    const rows = await this.db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(verificationTokens.id, id), isNull(verificationTokens.usedAt)))
      .returning({ id: verificationTokens.id });
    return rows.length > 0;
  }
}
