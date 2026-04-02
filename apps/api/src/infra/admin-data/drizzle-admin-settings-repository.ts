import { adminUsers } from '@pawmeet/db';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminSettingsRepository,
  AdminUserRow,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminSettingsRepository implements AdminSettingsRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listAdminUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResult<AdminUserRow>> {
    const { page, pageSize, search, role } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      conditions.push(
        or(ilike(adminUsers.email, `%${search}%`), ilike(adminUsers.displayName, `%${search}%`)),
      );
    }
    if (role) {
      conditions.push(eq(adminUsers.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: adminUsers.id,
          email: adminUsers.email,
          displayName: adminUsers.displayName,
          role: adminUsers.role,
          isActive: adminUsers.isActive,
          lastLoginAt: adminUsers.lastLoginAt,
          createdAt: adminUsers.createdAt,
        })
        .from(adminUsers)
        .where(whereClause)
        .orderBy(desc(adminUsers.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(adminUsers).where(whereClause),
    ]);

    return {
      data: items as AdminUserRow[],
      total: totalRow?.value ?? 0,
    };
  }

  async findAdminUserByEmail(email: string): Promise<{ id: string } | null> {
    const [existing] = await this.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    return existing ?? null;
  }

  async createAdminUser(input: {
    email: string;
    displayName: string;
    role: string;
    passwordHash: string;
  }): Promise<AdminUserRow | null> {
    const [created] = await this.db.insert(adminUsers).values(input).returning({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    });
    return (created as AdminUserRow) ?? null;
  }

  async findAdminUserById(
    id: string,
  ): Promise<{ id: string; role: string; isActive: boolean; displayName: string } | null> {
    const [target] = await this.db
      .select({
        id: adminUsers.id,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        displayName: adminUsers.displayName,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, id))
      .limit(1);
    return target ?? null;
  }

  async updateAdminRole(
    id: string,
    role: string,
  ): Promise<{ id: string; email: string; displayName: string; role: string } | null> {
    const [updated] = await this.db
      .update(adminUsers)
      .set({ role, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
      });
    return updated ?? null;
  }

  async toggleAdminActive(
    id: string,
    isActive: boolean,
  ): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
  } | null> {
    const [updated] = await this.db
      .update(adminUsers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
      });
    return updated ?? null;
  }

  async updateAdminPassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(adminUsers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, id));
  }
}
