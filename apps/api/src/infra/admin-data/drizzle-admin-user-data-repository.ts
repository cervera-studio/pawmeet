import {
  dogProfiles,
  matches,
  passkeyCredentials,
  reports,
  userConsents,
  users,
} from '@pawmeet/db';
import { and, asc, count, desc, eq, ilike, isNotNull, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminDeletionItem,
  AdminUserConsent,
  AdminUserDetail,
  AdminUserDog,
  AdminUserListItem,
  AdminUserRepository,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminUserDataRepository implements AdminUserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    items: AdminUserListItem[];
    total: number;
    dogCounts: { ownerId: string; count: number }[];
  }> {
    const { page, pageSize, search, sortBy, sortOrder } = input;
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? or(ilike(users.displayName, `%${search}%`), ilike(users.email, `%${search}%`))
      : undefined;

    const sortColumn = (() => {
      if (sortBy === 'name') return users.displayName;
      if (sortBy === 'email') return users.email;
      return users.createdAt;
    })();
    const orderFn = sortOrder === 'asc' ? sql`${sortColumn} asc` : desc(sortColumn);

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.displayName,
          email: users.email,
          isActive: users.isActive,
          followersCount: users.followersCount,
          followingCount: users.followingCount,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(searchCondition)
        .orderBy(orderFn)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(users).where(searchCondition),
    ]);

    const userIds = items.map((u) => u.id);
    const dogCounts =
      userIds.length > 0
        ? await this.db
            .select({
              ownerId: dogProfiles.ownerId,
              count: count(),
            })
            .from(dogProfiles)
            .where(or(...userIds.map((uid) => eq(dogProfiles.ownerId, uid))))
            .groupBy(dogProfiles.ownerId)
        : [];

    return {
      items: items as AdminUserListItem[],
      total: totalRow?.value ?? 0,
      dogCounts,
    };
  }

  async getUser(id: string): Promise<{
    user: AdminUserDetail;
    dogs: AdminUserDog[];
    passkeys: {
      id: string;
      friendlyName: string | null;
      deviceType: string;
      backedUp: boolean;
      createdAt: Date;
      lastUsedAt: Date | null;
    }[];
    reportsCount: number;
    matchesCount: number;
  } | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        authProvider: users.authProvider,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        followersCount: users.followersCount,
        followingCount: users.followingCount,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) return null;

    const dogs = await this.db
      .select({
        id: dogProfiles.id,
        name: dogProfiles.name,
        breed: dogProfiles.breed,
        isActive: dogProfiles.isActive,
      })
      .from(dogProfiles)
      .where(eq(dogProfiles.ownerId, id));

    const passkeys = await this.db
      .select({
        id: passkeyCredentials.id,
        friendlyName: passkeyCredentials.friendlyName,
        deviceType: passkeyCredentials.deviceType,
        backedUp: passkeyCredentials.backedUp,
        createdAt: passkeyCredentials.createdAt,
        lastUsedAt: passkeyCredentials.lastUsedAt,
      })
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, id));

    const [reportsRow] = await this.db
      .select({ value: count() })
      .from(reports)
      .where(eq(reports.reportedUserId, id));

    const dogIds = dogs.map((d) => d.id);
    const [matchesRow] =
      dogIds.length > 0
        ? await this.db
            .select({ value: count() })
            .from(matches)
            .where(
              or(...dogIds.flatMap((did) => [eq(matches.dogAId, did), eq(matches.dogBId, did)])),
            )
        : [{ value: 0 }];

    return {
      user: user as AdminUserDetail,
      dogs: dogs as AdminUserDog[],
      passkeys,
      reportsCount: reportsRow?.value ?? 0,
      matchesCount: matchesRow?.value ?? 0,
    };
  }

  async findUserById(id: string): Promise<{ id: string; isActive: boolean } | null> {
    const [user] = await this.db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, id));
    if (!user) return null;
    return user;
  }

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await this.db.update(users).set({ isActive }).where(eq(users.id, userId));
  }

  async cancelDeletion(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ isActive: true, deletionScheduledAt: null })
      .where(eq(users.id, userId));
  }

  async listPendingDeletions(input: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<AdminDeletionItem>> {
    const { page, pageSize } = input;
    const offset = (page - 1) * pageSize;

    const condition = and(eq(users.isActive, false), isNotNull(users.deletionScheduledAt));

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          createdAt: users.createdAt,
          deletionScheduledAt: users.deletionScheduledAt,
        })
        .from(users)
        .where(condition)
        .orderBy(users.deletionScheduledAt)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(users).where(condition),
    ]);

    return {
      data: items as AdminDeletionItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async deactivateUser(userId: string): Promise<void> {
    await this.db.update(users).set({ isActive: false }).where(eq(users.id, userId));
  }

  async getUserConsents(userId: string): Promise<AdminUserConsent[]> {
    const rows = await this.db
      .select({
        consentType: userConsents.consentType,
        granted: userConsents.granted,
        grantedAt: userConsents.grantedAt,
        withdrawnAt: userConsents.withdrawnAt,
        source: userConsents.source,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(asc(userConsents.consentType));
    return rows;
  }
}
