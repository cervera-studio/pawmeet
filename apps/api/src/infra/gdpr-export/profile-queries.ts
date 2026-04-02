import { oauthAccounts, users } from '@pawmeet/db';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GdprOAuthAccount, GdprProfile } from '../../ports/gdpr-export-repository.js';

export function createProfileQueries(db: NodePgDatabase) {
  return {
    async getProfile(userId: string): Promise<GdprProfile | null> {
      const rows = await db
        .select({
          email: users.email,
          displayName: users.displayName,
          authProvider: users.authProvider,
          avatarUrl: users.avatarUrl,
          latitude: users.latitude,
          longitude: users.longitude,
          locationUpdatedAt: users.locationUpdatedAt,
          searchRadiusKm: users.searchRadiusKm,
          emailVerified: users.emailVerified,
          notificationPrefs: users.notificationPrefs,
          dateOfBirth: users.dateOfBirth,
          pushToken: users.pushToken,
          followersCount: users.followersCount,
          followingCount: users.followingCount,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return (rows[0] as GdprProfile | undefined) ?? null;
    },

    async getOAuthAccounts(userId: string): Promise<GdprOAuthAccount[]> {
      return db
        .select({
          provider: oauthAccounts.provider,
          providerEmail: oauthAccounts.providerEmail,
          linkedAt: oauthAccounts.linkedAt,
        })
        .from(oauthAccounts)
        .where(eq(oauthAccounts.userId, userId)) as unknown as GdprOAuthAccount[];
    },
  };
}
