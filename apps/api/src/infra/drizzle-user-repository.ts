import { dogProfiles, users } from '@pawmeet/db';
import type { User } from '@pawmeet/types';
import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  CreateUserInput,
  NearbyQuery,
  NearbyUser,
  SearchResult,
  UserRepository,
} from '../ports/user-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

/** Default column selection — excludes passwordHash to prevent leaking to clients */
const safeUserColumns = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  authProvider: users.authProvider,
  avatarUrl: users.avatarUrl,
  latitude: users.latitude,
  longitude: users.longitude,
  locationUpdatedAt: users.locationUpdatedAt,
  searchRadiusKm: users.searchRadiusKm,
  emailVerified: users.emailVerified,
  isActive: users.isActive,
  createdAt: users.createdAt,
  notificationPrefs: users.notificationPrefs,
  dateOfBirth: users.dateOfBirth,
  locale: users.locale,
  pushToken: users.pushToken,
  lastLoginAt: users.lastLoginAt,
  deletionScheduledAt: users.deletionScheduledAt,
  followersCount: users.followersCount,
  followingCount: users.followingCount,
  termsAcceptedAt: users.termsAcceptedAt,
  privacyPolicyVersion: users.privacyPolicyVersion,
  onboardingCompletedAt: users.onboardingCompletedAt,
  privacyPrefs: users.privacyPrefs,
} as const;

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findByEmail(email: string): Promise<User | null> {
    // Include passwordHash — needed for login/password verification
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    return firstRowOrNull<User>(rows);
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select(safeUserColumns).from(users).where(eq(users.id, id));
    return firstRowOrNull<User>(rows);
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    return firstRowOrNull<User>(rows);
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select(safeUserColumns).from(users).where(inArray(users.id, ids));
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
        | 'onboardingCompletedAt'
        | 'privacyPrefs'
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
    // Escape ILIKE metacharacters to prevent information disclosure (searching "%" would match all)
    const escaped = query.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${escaped}%`;
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
        privacyPrefs: users.privacyPrefs,
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId),
          eq(users.isActive, true),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`ST_DWithin(${rowPoint}, ${userPoint}, ${radiusMeters})`,
          // Exclude users who have hidden their profile
          sql`COALESCE((${users.privacyPrefs}->>'profileVisible')::boolean, true) = true`,
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

    return rows.map((r) => {
      const wantsApproximate = r.privacyPrefs?.approximateDistance ?? false;
      // Default: ~100m precision (2 decimals). Approximate: ~1km precision (1 decimal).
      const precision = wantsApproximate ? 10 : 100;
      return {
        id: r.id,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        distanceKm: wantsApproximate ? Math.round(r.distanceKm) : r.distanceKm,
        approximateLatitude: Math.round((r.latitude ?? 0) * precision) / precision,
        approximateLongitude: Math.round((r.longitude ?? 0) * precision) / precision,
        dogs: dogsByOwner.get(r.id) ?? [],
      };
    });
  }
}
