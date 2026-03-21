import { dogPhotos, dogProfiles } from '@pawmeet/db';
import type { DogPhoto, DogProfile } from '@pawmeet/types';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CreateDogInput, DogRepository } from '../ports/dog-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleDogRepository implements DogRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findById(id: string): Promise<DogProfile | null> {
    const rows = await this.db.select().from(dogProfiles).where(eq(dogProfiles.id, id));
    return firstRowOrNull<DogProfile>(rows);
  }

  async findByIds(ids: string[]): Promise<DogProfile[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(dogProfiles).where(inArray(dogProfiles.id, ids));
    return rowsAs<DogProfile>(rows);
  }

  async findByOwner(ownerId: string, activeOnly = true): Promise<DogProfile[]> {
    const conditions = [eq(dogProfiles.ownerId, ownerId)];
    if (activeOnly) {
      conditions.push(eq(dogProfiles.isActive, true));
    }
    const rows = await this.db
      .select()
      .from(dogProfiles)
      .where(and(...conditions));
    return rowsAs<DogProfile>(rows);
  }

  async findByIdAndOwner(id: string, ownerId: string): Promise<DogProfile | null> {
    const rows = await this.db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.id, id), eq(dogProfiles.ownerId, ownerId)));
    return firstRowOrNull<DogProfile>(rows);
  }

  async countByOwner(ownerId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, ownerId), eq(dogProfiles.isActive, true)));
    return row?.count ?? 0;
  }

  async create(input: CreateDogInput): Promise<DogProfile> {
    const rows = await this.db.insert(dogProfiles).values(input).returning();
    return firstRow<DogProfile>(rows);
  }

  async update(id: string, data: Partial<CreateDogInput>): Promise<DogProfile> {
    const rows = await this.db
      .update(dogProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dogProfiles.id, id))
      .returning();
    return firstRow<DogProfile>(rows);
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(dogProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dogProfiles.id, id));
  }

  // Photos

  async findPhotos(dogId: string): Promise<DogPhoto[]> {
    const rows = await this.db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId))
      .orderBy(asc(dogPhotos.position));
    return rowsAs<DogPhoto>(rows);
  }

  async countPhotos(dogId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId));
    return row?.count ?? 0;
  }

  async addPhoto(input: {
    dogId: string;
    url: string;
    position: number;
    isPrimary: boolean;
  }): Promise<DogPhoto> {
    const rows = await this.db.insert(dogPhotos).values(input).returning();
    return firstRow<DogPhoto>(rows);
  }

  async findPhoto(photoId: string, dogId: string): Promise<DogPhoto | null> {
    const rows = await this.db
      .select()
      .from(dogPhotos)
      .where(and(eq(dogPhotos.id, photoId), eq(dogPhotos.dogId, dogId)));
    return firstRowOrNull<DogPhoto>(rows);
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.db.delete(dogPhotos).where(eq(dogPhotos.id, photoId));
  }

  async updatePhotoPositions(
    updates: { id: string; position: number; isPrimary: boolean }[],
  ): Promise<void> {
    for (const update of updates) {
      await this.db
        .update(dogPhotos)
        .set({ position: update.position, isPrimary: update.isPrimary })
        .where(eq(dogPhotos.id, update.id));
    }
  }

  async findPhotoById(photoId: string): Promise<DogPhoto | null> {
    const rows = await this.db.select().from(dogPhotos).where(eq(dogPhotos.id, photoId));
    return firstRowOrNull<DogPhoto>(rows);
  }

  async updatePhotoModerationStatus(
    photoId: string,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    await this.db
      .update(dogPhotos)
      .set({ moderationStatus: status })
      .where(eq(dogPhotos.id, photoId));
  }
}
