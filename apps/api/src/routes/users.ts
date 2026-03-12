import { zValidator } from '@hono/zod-validator';
import {
  confirmUploadSchema,
  updateLocationSchema,
  updatePreferencesSchema,
} from '@pawmeet/validation';
import { Hono } from 'hono';
import { z } from 'zod';
import type { userDeps as UserDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { ALLOWED_IMAGE_TYPES_TUPLE, MAX_FILE_SIZE } from '../lib/storage.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

const uploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES_TUPLE),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const nearbyQuerySchema = z.object({
  radiusKm: z.coerce.number().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export function createUserRoutes(deps: typeof UserDeps) {
  return new Hono<Env>()
    .use('/*', authMiddleware)

    .get('/me', async (c) => {
      const userId = c.get('userId');
      const result = await deps.getProfile(userId);
      return handleResult(c, result);
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
