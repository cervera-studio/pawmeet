import { refreshTokens, type TokenType, verificationTokens } from '@dogwalk/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  RefreshTokenRecord,
  TokenRepository,
  VerificationTokenRecord,
} from '../ports/token-repository.js';
import { firstRow, firstRowOrNull } from './drizzle-helpers.js';

export class DrizzleTokenRepository implements TokenRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  // Refresh tokens

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const rows = await this.db.insert(refreshTokens).values(input).returning();
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
}
