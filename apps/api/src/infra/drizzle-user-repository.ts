import { dogProfiles, users } from '@pawmeet/db';
import type { User } from '@pawmeet/types';
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  CreateUserInput,
  NearbyQuery,
  NearbyUser,
  SearchResult,
  UserRepository,
} from '../ports/user-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    return firstRowOrNull<User>(rows);
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    return firstRowOrNull<User>(rows);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(users).where(inArray(users.id, ids));
    return rowsAs<User>(rows);
  }

  async create(input: CreateUserInput): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        authProvider: input.authProvider ?? 'email',
        dateOfBirth: input.dateOfBirth ?? null,
      })
      .returning();
    return firstRow<User>(rows);
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
        | 'deletionScheduledAt'
        | 'notificationPrefs'
      >
    >,
  ): Promise<User> {
    const rows = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return firstRow<User>(rows);
  }

  async updatePushToken(userId: string, token: string | null): Promise<void> {
    await this.db.update(users).set({ pushToken: token }).where(eq(users.id, userId));
  }

  async findPushToken(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ pushToken: users.pushToken })
      .from(users)
      .where(eq(users.id, userId));
    return row?.pushToken ?? null;
  }

  async searchByName(
    query: string,
    excludeUserId: string,
    limit: number,
    offset: number,
  ): Promise<SearchResult[]> {
    // Use ILIKE for case-insensitive prefix/contains search
    // For production scale, add pg_trgm index: CREATE INDEX users_display_name_trgm ON users USING gin (display_name gin_trgm_ops);
    const pattern = `%${query}%`;
    const rows = await this.db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          ne(users.id, excludeUserId),
          eq(users.isActive, true),
          sql`${users.displayName} ILIKE ${pattern}`,
        ),
      )
      .orderBy(users.displayName)
      .limit(limit)
      .offset(offset);

    return rowsAs<SearchResult>(rows);
  }

  async findNearby(query: NearbyQuery): Promise<NearbyUser[]> {
    const { userId, latitude, longitude, radiusKm, limit, offset } = query;

    const radiusMeters = radiusKm * 1000;

    const userPoint = sql`ST_Point(${longitude}, ${latitude})::geography`;
    const rowPoint = sql`ST_Point(${users.longitude}, ${users.latitude})::geography`;

    // PostGIS distance in meters, convert to km for output
    const distanceExpr = sql<number>`ST_Distance(${rowPoint}, ${userPoint}) / 1000`;

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
          sql`ST_DWithin(${rowPoint}, ${userPoint}, ${radiusMeters})`,
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
      .where(and(eq(dogProfiles.isActive, true), inArray(dogProfiles.ownerId, userIds)));

    const dogsByOwner = new Map<string, NearbyUser['dogs']>();
    for (const dog of dogRows) {
      const list = dogsByOwner.get(dog.ownerId) ?? [];
      list.push({
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        size: dog.size,
        energyLevel: dog.energyLevel,
        avatarUrl: null,
      });
      dogsByOwner.set(dog.ownerId, list);
    }

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      distanceKm: r.distanceKm,
      // Round to ~100m precision (2 decimals) to protect user privacy
      approximateLatitude: Math.round((r.latitude ?? 0) * 100) / 100,
      approximateLongitude: Math.round((r.longitude ?? 0) * 100) / 100,
      dogs: dogsByOwner.get(r.id) ?? [],
    }));
  }
}
