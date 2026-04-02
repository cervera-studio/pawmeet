import { dogPhotos, dogProfiles, users } from '@pawmeet/db';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminDogDetail,
  AdminDogListItem,
  AdminDogRepository,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminDogRepository implements AdminDogRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listDogs(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminDogListItem>> {
    const { page, pageSize, search } = input;
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? or(
          ilike(dogProfiles.name, `%${search}%`),
          ilike(dogProfiles.breed, `%${search}%`),
          ilike(users.displayName, `%${search}%`),
        )
      : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: dogProfiles.id,
          name: dogProfiles.name,
          breed: dogProfiles.breed,
          size: dogProfiles.size,
          isActive: dogProfiles.isActive,
          createdAt: dogProfiles.createdAt,
          ownerName: users.displayName,
          ownerId: users.id,
        })
        .from(dogProfiles)
        .leftJoin(users, eq(dogProfiles.ownerId, users.id))
        .where(searchCondition)
        .orderBy(desc(dogProfiles.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(dogProfiles)
        .leftJoin(users, eq(dogProfiles.ownerId, users.id))
        .where(searchCondition),
    ]);

    return {
      data: items as AdminDogListItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async getDog(id: string): Promise<AdminDogDetail | null> {
    const [dog] = await this.db
      .select({
        id: dogProfiles.id,
        name: dogProfiles.name,
        breed: dogProfiles.breed,
        breedSecondary: dogProfiles.breedSecondary,
        size: dogProfiles.size,
        weightKg: dogProfiles.weightKg,
        gender: dogProfiles.gender,
        isNeutered: dogProfiles.isNeutered,
        energyLevel: dogProfiles.energyLevel,
        behaviorWithDogs: dogProfiles.behaviorWithDogs,
        behaviorWithPeople: dogProfiles.behaviorWithPeople,
        leashBehavior: dogProfiles.leashBehavior,
        bio: dogProfiles.bio,
        isActive: dogProfiles.isActive,
        createdAt: dogProfiles.createdAt,
        ownerName: users.displayName,
        ownerId: users.id,
      })
      .from(dogProfiles)
      .leftJoin(users, eq(dogProfiles.ownerId, users.id))
      .where(eq(dogProfiles.id, id));

    if (!dog) return null;

    const photos = await this.db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, id))
      .orderBy(dogPhotos.position);

    return { ...dog, photos } as AdminDogDetail;
  }
}
