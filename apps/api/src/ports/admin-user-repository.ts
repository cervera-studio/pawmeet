export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
  findById(id: string): Promise<AdminUser | null>;
  updateLastLogin(id: string): Promise<void>;
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
}
