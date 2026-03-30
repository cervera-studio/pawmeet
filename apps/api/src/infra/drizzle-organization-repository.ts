import { organizationMembers, organizations } from '@pawmeet/db';
import type { Organization, OrganizationMember, OrganizationMemberRole } from '@pawmeet/types';
import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  CreateOrganizationInput,
  ListOrganizationsQuery,
  OrganizationRepository,
} from '../ports/organization-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const rows = await this.db.insert(organizations).values(input).returning();
    return firstRow<Organization>(rows);
  }

  async findById(id: string): Promise<Organization | null> {
    const rows = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return firstRowOrNull<Organization>(rows);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const rows = await this.db.select().from(organizations).where(eq(organizations.slug, slug));
    return firstRowOrNull<Organization>(rows);
  }

  async list(query: ListOrganizationsQuery): Promise<{ data: Organization[]; total: number }> {
    const { page, pageSize, search, type } = query;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      conditions.push(
        or(ilike(organizations.name, `%${search}%`), ilike(organizations.slug, `%${search}%`)),
      );
    }
    if (type) {
      conditions.push(eq(organizations.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(organizations)
        .where(whereClause)
        .orderBy(organizations.createdAt)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(organizations).where(whereClause),
    ]);

    return {
      data: rowsAs<Organization>(items),
      total: totalRow?.value ?? 0,
    };
  }

  async update(id: string, data: Partial<CreateOrganizationInput>): Promise<Organization> {
    const rows = await this.db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return firstRow<Organization>(rows);
  }

  async verify(id: string, adminUserId: string): Promise<Organization> {
    const rows = await this.db
      .update(organizations)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return firstRow<Organization>(rows);
  }

  async revoke(id: string): Promise<Organization> {
    const rows = await this.db
      .update(organizations)
      .set({
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return firstRow<Organization>(rows);
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationMemberRole,
  ): Promise<OrganizationMember> {
    const rows = await this.db
      .insert(organizationMembers)
      .values({ organizationId, userId, role })
      .returning();
    return firstRow<OrganizationMember>(rows);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );
  }

  async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    const rows = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );
    return firstRowOrNull<OrganizationMember>(rows);
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const rows = await this.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))
      .orderBy(organizationMembers.createdAt);
    return rowsAs<OrganizationMember>(rows);
  }

  async isMemberOfVerifiedOrg(
    userId: string,
  ): Promise<{ isMember: boolean; organizationId: string | null }> {
    const rows = await this.db
      .select({
        organizationId: organizationMembers.organizationId,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizations.isVerified, true),
          eq(organizations.isActive, true),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return { isMember: false, organizationId: null };
    }

    return { isMember: true, organizationId: rows[0]?.organizationId ?? null };
  }
}
