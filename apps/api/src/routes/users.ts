import {
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
} from '@dogwalk/config';
import { users } from '@dogwalk/db';
import { zValidator } from '@hono/zod-validator';
import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  deleteObject,
  extractKeyFromUrl,
  generateUploadUrl,
  getPublicUrl,
  MAX_FILE_SIZE,
} from '../lib/storage.js';
import { authMiddleware } from '../middleware/auth.js';

const uploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const confirmUploadSchema = z.object({
  key: z.string().min(1),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const nearbyQuerySchema = z.object({
  radiusKm: z.coerce.number().min(MIN_SEARCH_RADIUS_KM).max(MAX_SEARCH_RADIUS_KM).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const updatePreferencesSchema = z.object({
  searchRadiusKm: z.number().min(MIN_SEARCH_RADIUS_KM).max(MAX_SEARCH_RADIUS_KM),
});

type Env = { Variables: { userId: string } };

export const userRoutes = new Hono<Env>()
  .use('/*', authMiddleware)
  /** Get current user profile (excludes passwordHash). */
  .get('/me', async (c) => {
    const userId = c.get('userId');
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return c.json({ error: 'Utente non trovato' }, 404);
    }
    const { passwordHash: _, ...safeUser } = user;
    return c.json({ user: safeUser });
  })
  /** Update current user profile. (TODO) */
  .put('/me', async (c) => {
    // TODO: update current user profile
    return c.json({ message: 'update profile' });
  })
  /** Update current user's geolocation (latitude, longitude). */
  .put('/me/location', zValidator('json', updateLocationSchema), async (c) => {
    const userId = c.get('userId');
    const { latitude, longitude } = c.req.valid('json');

    await db
      .update(users)
      .set({ latitude, longitude, locationUpdatedAt: new Date() })
      .where(eq(users.id, userId));

    return c.json({ latitude, longitude, updatedAt: new Date().toISOString() });
  })
  /** Update user search preferences (searchRadiusKm). */
  .put('/me/preferences', zValidator('json', updatePreferencesSchema), async (c) => {
    const userId = c.get('userId');
    const { searchRadiusKm } = c.req.valid('json');

    await db.update(users).set({ searchRadiusKm }).where(eq(users.id, userId));

    return c.json({ searchRadiusKm });
  })

  /** Find nearby active users using Haversine distance formula. Supports radius, limit, offset. */
  .get('/nearby', zValidator('query', nearbyQuerySchema), async (c) => {
    const userId = c.get('userId');
    const { radiusKm, limit: queryLimit, offset: queryOffset } = c.req.valid('query');

    // Get current user's location and search radius
    const [currentUser] = await db
      .select({
        latitude: users.latitude,
        longitude: users.longitude,
        searchRadiusKm: users.searchRadiusKm,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!currentUser?.latitude || !currentUser?.longitude) {
      return c.json({ error: 'Posizione non impostata. Aggiorna la tua posizione.' }, 400);
    }

    const effectiveRadius = radiusKm ?? currentUser.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;
    const effectiveLimit = queryLimit ?? 20;
    const effectiveOffset = queryOffset ?? 0;

    // Haversine distance formula in SQL (returns km)
    const distanceExpr = sql<number>`(
      6371 * acos(
        cos(radians(${currentUser.latitude}))
        * cos(radians(${users.latitude}))
        * cos(radians(${users.longitude}) - radians(${currentUser.longitude}))
        + sin(radians(${currentUser.latitude}))
        * sin(radians(${users.latitude}))
      )
    )`;

    const nearbyUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        distanceKm: distanceExpr,
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId),
          eq(users.isActive, true),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          sql`${distanceExpr} <= ${effectiveRadius}`,
        ),
      )
      .orderBy(distanceExpr)
      .limit(effectiveLimit)
      .offset(effectiveOffset);

    return c.json({
      users: nearbyUsers,
      radius: effectiveRadius,
      total: nearbyUsers.length,
    });
  })

  /** Delete user account. (TODO) */
  .delete('/me', async (c) => {
    // TODO: delete account
    return c.json({ message: 'delete account' });
  })

  /** Get presigned URL to upload an avatar image to R2. */
  .post('/me/avatar/upload-url', zValidator('json', uploadUrlSchema), async (c) => {
    const userId = c.get('userId');
    const { contentType } = c.req.valid('json');

    const { uploadUrl, key } = await generateUploadUrl(userId, contentType as AllowedImageType);

    return c.json({ uploadUrl, key });
  })

  /** Confirm avatar upload. Deletes old avatar from R2 if present. */
  .post('/me/avatar/confirm', zValidator('json', confirmUploadSchema), async (c) => {
    const userId = c.get('userId');
    const { key } = c.req.valid('json');

    // Validate that the key belongs to this user
    if (!key.startsWith(`avatars/${userId}/`)) {
      return c.json({ error: 'Chiave non valida' }, 403);
    }

    // Delete the old avatar from R2 if present
    const [user] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId));
    if (user?.avatarUrl) {
      const oldKey = extractKeyFromUrl(user.avatarUrl);
      try {
        await deleteObject(oldKey);
      } catch {
        // Old file may already be gone, continue
      }
    }

    // Update user record with new avatar URL
    const publicUrl = getPublicUrl(key);
    await db.update(users).set({ avatarUrl: publicUrl }).where(eq(users.id, userId));

    return c.json({ avatarUrl: publicUrl });
  })

  /** Delete current user's avatar from R2 and clear DB reference. */
  .delete('/me/avatar', async (c) => {
    const userId = c.get('userId');

    const [user] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId));
    if (!user?.avatarUrl) {
      return c.json({ error: 'Nessun avatar da eliminare' }, 404);
    }

    // Delete from R2
    const key = extractKeyFromUrl(user.avatarUrl);
    await deleteObject(key);

    // Clear avatar URL in DB
    await db.update(users).set({ avatarUrl: null }).where(eq(users.id, userId));

    return c.json({ message: 'Avatar eliminato' });
  });
