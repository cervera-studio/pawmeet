import { adminUsers } from '@pawmeet/db';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { AdminUser, AdminUserRepository } from '../ports/admin-user-repository.js';
import { firstRowOrNull } from './drizzle-helpers.js';

/** Columns without passwordHash — safe for non-auth queries */
const safeAdminColumns = {
  id: adminUsers.id,
  email: adminUsers.email,
  displayName: adminUsers.displayName,
  role: adminUsers.role,
  isActive: adminUsers.isActive,
  refreshTokenHash: adminUsers.refreshTokenHash,
  lastLoginAt: adminUsers.lastLoginAt,
  createdAt: adminUsers.createdAt,
  updatedAt: adminUsers.updatedAt,
} as const;

export class DrizzleAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    // Include passwordHash — needed for login
    const rows = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return firstRowOrNull<AdminUser>(rows);
  }

  async findById(id: string): Promise<AdminUser | null> {
    const rows = await this.db
      .select(safeAdminColumns)
      .from(adminUsers)
      .where(eq(adminUsers.id, id));
    return firstRowOrNull<AdminUser>(rows);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(adminUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, id));
  }

  async updateRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.db
      .update(adminUsers)
      .set({ refreshTokenHash: hash, updatedAt: new Date() })
      .where(eq(adminUsers.id, id));
  }
}
