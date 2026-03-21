export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: string;
  isActive: boolean;
  refreshTokenHash: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
  findById(id: string): Promise<AdminUser | null>;
  updateLastLogin(id: string): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  updateRefreshTokenHash(id: string, hash: string | null): Promise<void>;
  updateTotpSecret(id: string, secret: string | null): Promise<void>;
  enableTotp(id: string): Promise<void>;
  disableTotp(id: string): Promise<void>;
}
