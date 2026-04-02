import { organizationMembers, organizations, users } from '@pawmeet/db';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminOrganizationDetail,
  AdminOrganizationItem,
  AdminOrganizationMember,
  AdminOrganizationRepository,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminOrganizationRepository implements AdminOrganizationRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listOrganizations(input: {
    page: number;
    pageSize: number;
    search?: string;
    type?: string;
  }): Promise<{
    items: AdminOrganizationItem[];
    total: number;
    memberCounts: { organizationId: string; count: number }[];
  }> {
    const { page, pageSize, search, type } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (import('drizzle-orm').SQL | undefined)[] = [];
    if (search) {
      conditions.push(
        or(ilike(organizations.name, `%${search}%`), ilike(organizations.slug, `%${search}%`)),
      );
    }
    if (type) conditions.push(eq(organizations.type, type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          type: organizations.type,
          description: organizations.description,
          logoUrl: organizations.logoUrl,
          websiteUrl: organizations.websiteUrl,
          contactEmail: organizations.contactEmail,
          isVerified: organizations.isVerified,
          verifiedAt: organizations.verifiedAt,
          isActive: organizations.isActive,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(whereClause)
        .orderBy(desc(organizations.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(organizations).where(whereClause),
    ]);

    const orgIds = items.map((o) => o.id);
    const memberCounts =
      orgIds.length > 0
        ? await this.db
            .select({
              organizationId: organizationMembers.organizationId,
              count: count(),
            })
            .from(organizationMembers)
            .where(or(...orgIds.map((oid) => eq(organizationMembers.organizationId, oid))))
            .groupBy(organizationMembers.organizationId)
        : [];

    return {
      items: items as AdminOrganizationItem[],
      total: totalRow?.value ?? 0,
      memberCounts,
    };
  }

  async getOrganization(id: string): Promise<{
    organization: AdminOrganizationDetail;
    members: AdminOrganizationMember[];
  } | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) return null;

    const members = await this.db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        userName: users.displayName,
        userEmail: users.email,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, id))
      .orderBy(organizationMembers.createdAt);

    return {
      organization: org as AdminOrganizationDetail,
      members: members as AdminOrganizationMember[],
    };
  }

  async findOrganizationById(id: string): Promise<AdminOrganizationDetail | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return org ? (org as AdminOrganizationDetail) : null;
  }

  async verifyOrganization(id: string, verifiedBy: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id));
  }

  async revokeOrganization(id: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id));
  }
}
