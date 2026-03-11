import { adminUsers } from '@dogwalk/db';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { AdminUser, AdminUserRepository } from '../ports/admin-user-repository.js';
import { firstRowOrNull } from './drizzle-helpers.js';

export class DrizzleAdminUserRepository implements AdminUserRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findByEmail(email: string): Promise<AdminUser | null> {
    const rows = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return firstRowOrNull<AdminUser>(rows);
  }

  async findById(id: string): Promise<AdminUser | null> {
    const rows = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return firstRowOrNull<AdminUser>(rows);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
  }
}
