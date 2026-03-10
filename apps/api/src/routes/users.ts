import {
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
} from '@dogwalk/config';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { userDeps as UserDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../lib/storage.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

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

export function createUserRoutes(deps: typeof UserDeps) {
  return new Hono<Env>()
    .use('/*', authMiddleware)

    .get('/me', async (c) => {
      const userId = c.get('userId');
      const result = await deps.getProfile(userId);
      return handleResult(c, result);
    })

    .put('/me', async (c) => {
      // TODO: update current user profile
      return c.json({ message: 'update profile' });
    })

    .put('/me/location', zValidator('json', updateLocationSchema), async (c) => {
      const userId = c.get('userId');
      const { latitude, longitude } = c.req.valid('json');
      const result = await deps.updateLocation(userId, latitude, longitude);
      return handleResult(c, result);
    })

    .put('/me/preferences', zValidator('json', updatePreferencesSchema), async (c) => {
      const userId = c.get('userId');
      const { searchRadiusKm } = c.req.valid('json');
      const result = await deps.updatePreferences(userId, searchRadiusKm);
      return handleResult(c, result);
    })

    .get('/nearby', zValidator('query', nearbyQuerySchema), async (c) => {
      const userId = c.get('userId');
      const { radiusKm, limit, offset } = c.req.valid('query');
      const result = await deps.findNearby(userId, { radiusKm, limit, offset });
      return handleResult(c, result);
    })

    .delete('/me', async (c) => {
      // TODO: delete account
      return c.json({ message: 'delete account' });
    })

    .post('/me/avatar/upload-url', zValidator('json', uploadUrlSchema), async (c) => {
      const userId = c.get('userId');
      const { contentType } = c.req.valid('json');
      const result = await deps.uploadAvatarUrl(userId, contentType);
      return handleResult(c, result);
    })

    .post('/me/avatar/confirm', zValidator('json', confirmUploadSchema), async (c) => {
      const userId = c.get('userId');
      const { key } = c.req.valid('json');
      const result = await deps.confirmAvatar(userId, key);
      return handleResult(c, result);
    })

    .delete('/me/avatar', async (c) => {
      const userId = c.get('userId');
      const result = await deps.deleteAvatar(userId);
      return handleResult(c, result);
    });
}
