import type { TokenType } from '@pawmeet/db';

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  deviceName: string | null;
  deviceOs: string | null;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface VerificationTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  type: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface TokenRepository {
  // Refresh tokens
  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    familyId?: string;
    deviceName?: string | null;
    deviceOs?: string | null;
  }): Promise<RefreshTokenRecord>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeRefreshTokenByHash(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
  revokeTokenFamily(familyId: string): Promise<void>;

  // Verification tokens
  createVerificationToken(input: {
    userId: string;
    tokenHash: string;
    type: TokenType;
    expiresAt: Date;
  }): Promise<VerificationTokenRecord>;
  findValidVerificationTokenByUser(
    userId: string,
    tokenHash: string,
    type: TokenType,
  ): Promise<VerificationTokenRecord | null>;
  revokeAllVerificationTokens(userId: string, type: TokenType): Promise<void>;
  markVerificationTokenUsed(id: string): Promise<void>;
}
