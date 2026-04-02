import { breeds, dogProfiles } from '@pawmeet/db';
import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminBreedItem,
  AdminBreedRepository,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminBreedRepository implements AdminBreedRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listBreeds(input: {
    page: number;
    pageSize: number;
    search?: string;
    group?: string;
  }): Promise<PaginatedResult<AdminBreedItem>> {
    const { page, pageSize, search, group } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (import('drizzle-orm').SQL | undefined)[] = [];
    if (search) {
      conditions.push(ilike(breeds.code, `%${search}%`));
    }
    if (group) {
      conditions.push(eq(breeds.group, group));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select()
        .from(breeds)
        .where(whereClause)
        .orderBy(asc(breeds.code))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(breeds).where(whereClause),
    ]);

    return {
      data: items as AdminBreedItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async findBreedById(id: number): Promise<AdminBreedItem | null> {
    const [existing] = await this.db.select().from(breeds).where(eq(breeds.id, id));
    return (existing as AdminBreedItem) ?? null;
  }

  async createBreed(input: {
    code: string;
    group?: string;
    sizeCategory: string;
    avgWeightKg?: number;
  }): Promise<AdminBreedItem> {
    const [created] = await this.db.insert(breeds).values(input).returning();
    return created as AdminBreedItem;
  }

  async updateBreed(
    id: number,
    updates: Partial<Omit<AdminBreedItem, 'id'>>,
  ): Promise<AdminBreedItem | null> {
    const [updated] = await this.db
      .update(breeds)
      .set(updates)
      .where(eq(breeds.id, id))
      .returning();
    return updated ? (updated as AdminBreedItem) : null;
  }

  async deleteBreed(id: number): Promise<void> {
    await this.db.delete(breeds).where(eq(breeds.id, id));
  }

  async countDogsReferencingBreed(breedCode: string): Promise<number> {
    const [dogCount] = await this.db
      .select({ value: count() })
      .from(dogProfiles)
      .where(or(eq(dogProfiles.breed, breedCode), eq(dogProfiles.breedSecondary, breedCode)));
    return dogCount?.value ?? 0;
  }
}
