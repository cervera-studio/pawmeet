import { dogPhotos, dogProfiles } from '@dogwalk/db';
import type { DogPhoto, DogProfile } from '@dogwalk/types';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { CreateDogInput, DogRepository } from '../ports/dog-repository.js';

export class DrizzleDogRepository implements DogRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findById(id: string): Promise<DogProfile | null> {
    const [dog] = await this.db.select().from(dogProfiles).where(eq(dogProfiles.id, id));
    return (dog as DogProfile | undefined) ?? null;
  }

  async findByIds(ids: string[]): Promise<DogProfile[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(dogProfiles).where(inArray(dogProfiles.id, ids));
    return rows as DogProfile[];
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
    return rows as DogProfile[];
  }

  async findByIdAndOwner(id: string, ownerId: string): Promise<DogProfile | null> {
    const [dog] = await this.db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.id, id), eq(dogProfiles.ownerId, ownerId)));
    return (dog as DogProfile | undefined) ?? null;
  }

  async countByOwner(ownerId: string): Promise<number> {
    const rows = await this.db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, ownerId), eq(dogProfiles.isActive, true)));
    return rows.length;
  }

  async create(input: CreateDogInput): Promise<DogProfile> {
    const rows = await this.db.insert(dogProfiles).values(input).returning();
    return rows[0] as DogProfile;
  }

  async update(id: string, data: Partial<CreateDogInput>): Promise<DogProfile> {
    const rows = await this.db
      .update(dogProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dogProfiles.id, id))
      .returning();
    return rows[0] as DogProfile;
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
    return rows as DogPhoto[];
  }

  async countPhotos(dogId: string): Promise<number> {
    const rows = await this.db
      .select({ id: dogPhotos.id })
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId));
    return rows.length;
  }

  async addPhoto(input: {
    dogId: string;
    url: string;
    position: number;
    isPrimary: boolean;
  }): Promise<DogPhoto> {
    const rows = await this.db.insert(dogPhotos).values(input).returning();
    return rows[0] as DogPhoto;
  }

  async findPhoto(photoId: string, dogId: string): Promise<DogPhoto | null> {
    const [photo] = await this.db
      .select()
      .from(dogPhotos)
      .where(and(eq(dogPhotos.id, photoId), eq(dogPhotos.dogId, dogId)));
    return (photo as DogPhoto | undefined) ?? null;
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
}
