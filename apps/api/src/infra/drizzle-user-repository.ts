import { dogProfiles, users } from '@dogwalk/db';
import type { User } from '@dogwalk/types';
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  CreateUserInput,
  NearbyQuery,
  NearbyUser,
  UserRepository,
} from '../ports/user-repository.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return (user as User | undefined) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return (user as User | undefined) ?? null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(users)
      .where(inArray(users.id, ids));
    return rows as User[];
  }

  async create(input: CreateUserInput): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        authProvider: input.authProvider ?? 'email',
      })
      .returning();
    return rows[0] as User;
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        User,
        | 'passwordHash'
        | 'avatarUrl'
        | 'latitude'
        | 'longitude'
        | 'locationUpdatedAt'
        | 'searchRadiusKm'
        | 'emailVerified'
        | 'lastLoginAt'
        | 'isActive'
      >
    >,
  ): Promise<User> {
    const rows = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0] as User;
  }

  async findNearby(query: NearbyQuery): Promise<NearbyUser[]> {
    const { userId, latitude, longitude, radiusKm, limit, offset } = query;

    // Haversine distance formula in SQL (returns km)
    const distanceExpr = sql<number>`(
      6371 * acos(
        cos(radians(${latitude}))
        * cos(radians(${users.latitude}))
        * cos(radians(${users.longitude}) - radians(${longitude}))
        + sin(radians(${latitude}))
        * sin(radians(${users.latitude}))
      )
    )`;

    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        distanceKm: distanceExpr,
        latitude: users.latitude,
        longitude: users.longitude,
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId),
          eq(users.isActive, true),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`${distanceExpr} <= ${radiusKm}`,
        ),
      )
      .orderBy(distanceExpr)
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) return [];

    // Batch-fetch dogs for all nearby users
    const userIds = rows.map((r) => r.id);
    const dogRows = await this.db
      .select({
        id: dogProfiles.id,
        ownerId: dogProfiles.ownerId,
        name: dogProfiles.name,
        breed: dogProfiles.breed,
        size: dogProfiles.size,
        energyLevel: dogProfiles.energyLevel,
      })
      .from(dogProfiles)
      .where(
        and(
          eq(dogProfiles.isActive, true),
          inArray(dogProfiles.ownerId, userIds),
        ),
      );

    const dogsByOwner = new Map<string, NearbyUser['dogs']>();
    for (const dog of dogRows) {
      const list = dogsByOwner.get(dog.ownerId) ?? [];
      list.push({ id: dog.id, name: dog.name, breed: dog.breed, size: dog.size, energyLevel: dog.energyLevel, avatarUrl: null });
      dogsByOwner.set(dog.ownerId, list);
    }

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      distanceKm: r.distanceKm,
      latitude: r.latitude!,
      longitude: r.longitude!,
      dogs: dogsByOwner.get(r.id) ?? [],
    }));
  }
}
